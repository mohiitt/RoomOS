ALTER TABLE public.recurring_expenses
  ADD COLUMN IF NOT EXISTS split_config jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.expense_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  storage_url text NOT NULL,
  uploaded_by uuid REFERENCES public.roommates(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expense_attachments_expense_id_idx
  ON public.expense_attachments (expense_id, created_at);

ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.expense_attachments FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.chore_swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.chore_assignments(id) ON DELETE CASCADE,
  from_roommate_id uuid NOT NULL REFERENCES public.roommates(id),
  to_roommate_id uuid NOT NULL REFERENCES public.roommates(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chore_swap_parties_check CHECK (from_roommate_id <> to_roommate_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS chore_swap_pending_assignment_idx
  ON public.chore_swap_requests (assignment_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS chore_swap_to_pending_idx
  ON public.chore_swap_requests (to_roommate_id, created_at DESC)
  WHERE status = 'pending';

ALTER TABLE public.chore_swap_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.chore_swap_requests FROM PUBLIC, anon, authenticated;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'expense_added',
    'settlement_added',
    'inventory_low',
    'inventory_expiring',
    'chore_due',
    'chore_assigned',
    'concern_created',
    'concern_assigned',
    'concern_resolved',
    'shopping_added',
    'money_nudge',
    'chore_swap'
  ));

CREATE OR REPLACE FUNCTION public.generate_due_recurring_expenses()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_rule public.recurring_expenses;
  v_count integer := 0;
  v_loops integer;
  v_today date := public.apartment_today();
  v_amount numeric;
  v_roommates uuid[];
  v_n integer;
  v_cents integer;
  v_base integer;
  v_rem integer;
  v_splits jsonb;
  v_i integer;
  v_share numeric;
  v_next date;
  v_split_type text;
BEGIN
  FOR v_rule IN
    SELECT * FROM public.recurring_expenses
    WHERE is_active AND next_run_at <= v_today
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT COALESCE(array_agg(id ORDER BY created_at), ARRAY[]::uuid[])
    INTO v_roommates
    FROM public.roommates
    WHERE is_active;

    v_n := COALESCE(array_length(v_roommates, 1), 0);
    IF v_n < 1 OR v_rule.paid_by IS NULL THEN
      CONTINUE;
    END IF;

    v_loops := 0;
    v_next := v_rule.next_run_at;
    WHILE v_next <= v_today AND v_loops < 24 LOOP
      v_amount := v_rule.amount;
      v_split_type := COALESCE(v_rule.split_type, 'equal');

      IF jsonb_typeof(v_rule.split_config) = 'array'
         AND jsonb_array_length(v_rule.split_config) > 0 THEN
        v_splits := v_rule.split_config;
      ELSE
        v_cents := round(v_amount * 100)::integer;
        v_base := v_cents / v_n;
        v_rem := v_cents - (v_base * v_n);
        v_splits := '[]'::jsonb;
        v_split_type := 'equal';

        FOR v_i IN 1..v_n LOOP
          v_share := (v_base + CASE WHEN v_i <= v_rem THEN 1 ELSE 0 END) / 100.0;
          v_splits := v_splits || jsonb_build_array(jsonb_build_object(
            'roommate_id', v_roommates[v_i],
            'owed_amount', v_share,
            'percentage', NULL,
            'shares', NULL
          ));
        END LOOP;
      END IF;

      BEGIN
        PERFORM public.save_expense(
          NULL,
          v_rule.title,
          NULL,
          v_amount,
          v_rule.paid_by,
          v_rule.category,
          v_split_type,
          v_next,
          v_rule.paid_by,
          v_splits,
          true,
          v_rule.id
        );
        v_count := v_count + 1;
      EXCEPTION
        WHEN unique_violation THEN
          NULL;
      END;

      IF v_rule.frequency = 'weekly' THEN
        v_next := v_next + 7;
      ELSE
        v_next := (v_next + interval '1 month')::date;
      END IF;
      v_loops := v_loops + 1;
    END LOOP;

    UPDATE public.recurring_expenses
    SET next_run_at = v_next
    WHERE id = v_rule.id;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_recipe(
  p_id uuid,
  p_name text,
  p_instructions text,
  p_ingredients jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_row jsonb;
  v_i integer := 0;
BEGIN
  IF jsonb_typeof(p_ingredients) <> 'array' OR jsonb_array_length(p_ingredients) < 1 THEN
    RAISE EXCEPTION 'Add at least one ingredient';
  END IF;

  UPDATE public.recipes
  SET
    name = left(btrim(p_name), 80),
    instructions = left(btrim(p_instructions), 4000)
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipe not found';
  END IF;

  DELETE FROM public.recipe_ingredients WHERE recipe_id = p_id;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_ingredients)
  LOOP
    INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, sort_order)
    VALUES (
      p_id,
      left(btrim(v_row->>'name'), 80),
      left(btrim(v_row->>'quantity'), 40),
      left(btrim(COALESCE(v_row->>'unit', '')), 24),
      v_i
    );
    v_i := v_i + 1;
  END LOOP;

  RETURN p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_chore_with_rotation(
  p_id uuid,
  p_name text,
  p_description text,
  p_points integer,
  p_frequency text,
  p_roommate_ids uuid[]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_i integer;
BEGIN
  IF COALESCE(array_length(p_roommate_ids, 1), 0) < 1 THEN
    RAISE EXCEPTION 'Choose at least one roommate for the rotation';
  END IF;

  UPDATE public.chore_templates
  SET
    name = left(btrim(p_name), 80),
    description = NULLIF(left(btrim(COALESCE(p_description, '')), 500), ''),
    points = COALESCE(p_points, 10),
    frequency = CASE WHEN p_frequency = 'monthly' THEN 'monthly' ELSE 'weekly' END
  WHERE id = p_id AND is_active;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chore not found';
  END IF;

  DELETE FROM public.chore_rotations WHERE chore_template_id = p_id;

  FOR v_i IN 1..array_length(p_roommate_ids, 1) LOOP
    INSERT INTO public.chore_rotations (chore_template_id, roommate_id, rotation_position)
    VALUES (p_id, p_roommate_ids[v_i], v_i - 1);
  END LOOP;

  RETURN p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_chore_swap(
  p_assignment_id uuid,
  p_from uuid,
  p_to uuid
) RETURNS public.chore_swap_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_assignment public.chore_assignments;
  v_row public.chore_swap_requests;
BEGIN
  IF p_from = p_to THEN
    RAISE EXCEPTION 'Pick someone else to swap with';
  END IF;

  SELECT * INTO v_assignment
  FROM public.chore_assignments
  WHERE id = p_assignment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chore assignment not found';
  END IF;
  IF v_assignment.status <> 'pending' THEN
    RAISE EXCEPTION 'That chore is already closed';
  END IF;
  IF v_assignment.assigned_to <> p_from THEN
    RAISE EXCEPTION 'Only the assigned roommate can request a swap';
  END IF;

  UPDATE public.chore_swap_requests
  SET status = 'cancelled'
  WHERE assignment_id = p_assignment_id AND status = 'pending';

  INSERT INTO public.chore_swap_requests (
    assignment_id, from_roommate_id, to_roommate_id, status
  ) VALUES (
    p_assignment_id, p_from, p_to, 'pending'
  )
  RETURNING * INTO v_row;

  PERFORM public.insert_notifications(
    ARRAY[p_to],
    'chore_swap',
    'Swap request',
    'Someone wants to trade a chore with you.',
    'chore_assignment',
    p_assignment_id
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_chore_swap(
  p_id uuid,
  p_actor uuid,
  p_accept boolean
) RETURNS public.chore_swap_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_row public.chore_swap_requests;
  v_assignment public.chore_assignments;
BEGIN
  SELECT * INTO v_row
  FROM public.chore_swap_requests
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Swap request not found';
  END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'That swap is already closed';
  END IF;
  IF v_row.to_roommate_id <> p_actor THEN
    RAISE EXCEPTION 'Only the asked roommate can answer this swap';
  END IF;

  SELECT * INTO v_assignment
  FROM public.chore_assignments
  WHERE id = v_row.assignment_id
  FOR UPDATE;

  IF NOT FOUND OR v_assignment.status <> 'pending' THEN
    UPDATE public.chore_swap_requests SET status = 'cancelled' WHERE id = p_id;
    RAISE EXCEPTION 'That chore is no longer open';
  END IF;

  IF p_accept THEN
    UPDATE public.chore_assignments
    SET assigned_to = v_row.to_roommate_id
    WHERE id = v_row.assignment_id;

    UPDATE public.chore_swap_requests
    SET status = 'accepted'
    WHERE id = p_id
    RETURNING * INTO v_row;

    PERFORM public.insert_notifications(
      ARRAY[v_row.from_roommate_id],
      'chore_swap',
      'Swap accepted',
      'Your chore swap was accepted.',
      'chore_assignment',
      v_row.assignment_id
    );
  ELSE
    UPDATE public.chore_swap_requests
    SET status = 'declined'
    WHERE id = p_id
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;
