ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.settlements
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS expenses_live_date_idx
  ON public.expenses (expense_date DESC, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS settlements_live_date_idx
  ON public.settlements (settled_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.concern_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concern_id uuid NOT NULL REFERENCES public.concerns(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.roommates(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT concern_events_type_check
    CHECK (event_type IN (
      'created',
      'status_changed',
      'assigned',
      'unassigned',
      'priority_changed',
      'commented'
    ))
);

CREATE INDEX IF NOT EXISTS concern_events_concern_idx
  ON public.concern_events (concern_id, created_at DESC);

ALTER TABLE public.concern_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.concern_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apartment_balances()
RETURNS TABLE(roommate_id uuid, net numeric)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
  WITH nets AS (
    SELECT r.id AS roommate_id, 0::numeric AS cents
    FROM public.roommates r
    WHERE r.is_active
    UNION ALL
    SELECT e.paid_by, round(s.owed_amount * 100)
    FROM public.expenses e
    JOIN public.expense_splits s ON s.expense_id = e.id
    WHERE e.deleted_at IS NULL
    UNION ALL
    SELECT s.roommate_id, -round(s.owed_amount * 100)
    FROM public.expense_splits s
    JOIN public.expenses e ON e.id = s.expense_id
    WHERE e.deleted_at IS NULL
    UNION ALL
    SELECT st.payer_id, round(st.amount * 100)
    FROM public.settlements st
    WHERE st.deleted_at IS NULL
    UNION ALL
    SELECT st.receiver_id, -round(st.amount * 100)
    FROM public.settlements st
    WHERE st.deleted_at IS NULL
  )
  SELECT n.roommate_id, round(sum(n.cents) / 100.0, 2) AS net
  FROM nets n
  JOIN public.roommates r ON r.id = n.roommate_id AND r.is_active
  GROUP BY n.roommate_id;
$$;

CREATE OR REPLACE FUNCTION public.create_inventory_item(
  p_name text,
  p_quantity numeric,
  p_unit text,
  p_category text,
  p_storage_location text,
  p_ownership_type text,
  p_owner_id uuid,
  p_expiry_date date,
  p_minimum_quantity numeric,
  p_auto_add_to_shopping boolean,
  p_notes text,
  p_created_by uuid
) RETURNS public.inventory_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_item public.inventory_items;
BEGIN
  INSERT INTO public.inventory_items (
    name, quantity, unit, category, storage_location, ownership_type,
    owner_id, expiry_date, minimum_quantity, auto_add_to_shopping, notes, created_by
  ) VALUES (
    left(btrim(p_name), 80),
    0,
    left(btrim(p_unit), 24),
    NULLIF(left(btrim(COALESCE(p_category, '')), 40), ''),
    p_storage_location,
    p_ownership_type,
    p_owner_id,
    p_expiry_date,
    p_minimum_quantity,
    p_auto_add_to_shopping,
    NULLIF(left(btrim(COALESCE(p_notes, '')), 1000), ''),
    p_created_by
  )
  RETURNING * INTO v_item;

  IF COALESCE(p_quantity, 0) > 0 THEN
    v_item := public.adjust_inventory(v_item.id, p_created_by, 'add', p_quantity, 'Initial stock');
  END IF;

  RETURN v_item;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_chore_with_rotation(
  p_name text,
  p_description text,
  p_points integer,
  p_frequency text,
  p_created_by uuid,
  p_roommate_ids uuid[]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_i integer;
BEGIN
  IF COALESCE(array_length(p_roommate_ids, 1), 0) < 1 THEN
    RAISE EXCEPTION 'Choose at least one roommate for the rotation';
  END IF;

  INSERT INTO public.chore_templates (
    name, description, frequency, points, is_active, created_by
  ) VALUES (
    left(btrim(p_name), 80),
    NULLIF(left(btrim(COALESCE(p_description, '')), 500), ''),
    CASE WHEN p_frequency = 'monthly' THEN 'monthly' ELSE 'weekly' END,
    COALESCE(p_points, 10),
    true,
    p_created_by
  )
  RETURNING id INTO v_id;

  FOR v_i IN 1..array_length(p_roommate_ids, 1) LOOP
    INSERT INTO public.chore_rotations (chore_template_id, roommate_id, rotation_position)
    VALUES (v_id, p_roommate_ids[v_i], v_i - 1);
  END LOOP;

  PERFORM public.generate_due_chore_assignments();
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_recipe(
  p_name text,
  p_instructions text,
  p_created_by uuid,
  p_ingredients jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_row jsonb;
  v_i integer := 0;
BEGIN
  IF jsonb_typeof(p_ingredients) <> 'array' OR jsonb_array_length(p_ingredients) < 1 THEN
    RAISE EXCEPTION 'Add at least one ingredient';
  END IF;

  INSERT INTO public.recipes (name, instructions, created_by)
  VALUES (left(btrim(p_name), 80), left(btrim(p_instructions), 4000), p_created_by)
  RETURNING id INTO v_id;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_ingredients)
  LOOP
    INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, sort_order)
    VALUES (
      v_id,
      left(btrim(v_row->>'name'), 80),
      left(btrim(v_row->>'quantity'), 40),
      left(btrim(COALESCE(v_row->>'unit', '')), 24),
      v_i
    );
    v_i := v_i + 1;
  END LOOP;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.concern_status_allowed(p_from text, p_to text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_from = p_to THEN true
    WHEN p_from = 'open' AND p_to IN ('assigned', 'in_progress', 'resolved') THEN true
    WHEN p_from = 'assigned' AND p_to IN ('open', 'in_progress', 'resolved') THEN true
    WHEN p_from = 'in_progress' AND p_to IN ('assigned', 'resolved') THEN true
    WHEN p_from = 'resolved' AND p_to IN ('open', 'assigned') THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.create_concern(
  p_title text,
  p_description text,
  p_priority text,
  p_reported_by uuid,
  p_assigned_to uuid
) RETURNS public.concerns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_row public.concerns;
BEGIN
  INSERT INTO public.concerns (
    title, description, priority, status, reported_by, assigned_to
  ) VALUES (
    left(btrim(p_title), 80),
    NULLIF(left(btrim(COALESCE(p_description, '')), 2000), ''),
    p_priority,
    CASE WHEN p_assigned_to IS NULL THEN 'open' ELSE 'assigned' END,
    p_reported_by,
    p_assigned_to
  )
  RETURNING * INTO v_row;

  INSERT INTO public.concern_events (concern_id, actor_id, event_type, to_status, payload)
  VALUES (
    v_row.id,
    p_reported_by,
    'created',
    v_row.status,
    jsonb_build_object('priority', v_row.priority, 'assigned_to', v_row.assigned_to)
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_concern(
  p_id uuid,
  p_status text,
  p_assigned_to uuid,
  p_clear_assignee boolean,
  p_priority text,
  p_actor_id uuid
) RETURNS public.concerns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_before public.concerns;
  v_after public.concerns;
  v_next_status text;
  v_assigned uuid;
  v_priority text;
  v_event text;
BEGIN
  SELECT * INTO v_before FROM public.concerns WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Issue not found';
  END IF;

  v_assigned := v_before.assigned_to;
  IF p_clear_assignee THEN
    v_assigned := NULL;
  ELSIF p_assigned_to IS NOT NULL THEN
    v_assigned := p_assigned_to;
  END IF;

  v_priority := COALESCE(p_priority, v_before.priority);
  v_next_status := COALESCE(p_status, v_before.status);

  IF p_status IS NULL THEN
    IF v_before.status IN ('resolved', 'in_progress') THEN
      v_next_status := v_before.status;
    ELSIF v_assigned IS NOT NULL AND v_before.status = 'open' THEN
      v_next_status := 'assigned';
    ELSIF v_assigned IS NULL AND v_before.status = 'assigned' THEN
      v_next_status := 'open';
    END IF;
  END IF;

  IF NOT public.concern_status_allowed(v_before.status, v_next_status) THEN
    RAISE EXCEPTION 'That issue cannot move to that status';
  END IF;

  UPDATE public.concerns
  SET
    status = v_next_status,
    assigned_to = v_assigned,
    priority = v_priority,
    resolved_at = CASE
      WHEN v_next_status = 'resolved' THEN COALESCE(v_before.resolved_at, now())
      ELSE NULL
    END
  WHERE id = p_id
  RETURNING * INTO v_after;

  IF v_after.status IS DISTINCT FROM v_before.status THEN
    v_event := 'status_changed';
  ELSIF v_after.assigned_to IS DISTINCT FROM v_before.assigned_to THEN
    v_event := CASE WHEN v_after.assigned_to IS NULL THEN 'unassigned' ELSE 'assigned' END;
  ELSE
    v_event := 'priority_changed';
  END IF;

  IF v_after.status IS DISTINCT FROM v_before.status
     OR v_after.assigned_to IS DISTINCT FROM v_before.assigned_to
     OR v_after.priority IS DISTINCT FROM v_before.priority THEN
    INSERT INTO public.concern_events (
      concern_id, actor_id, event_type, from_status, to_status, payload
    ) VALUES (
      p_id,
      p_actor_id,
      v_event,
      v_before.status,
      v_after.status,
      jsonb_build_object('assigned_to', v_after.assigned_to, 'priority', v_after.priority)
    );
  END IF;

  RETURN v_after;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_concern_comment(
  p_concern_id uuid,
  p_roommate_id uuid,
  p_comment text
) RETURNS public.concern_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_row public.concern_comments;
BEGIN
  INSERT INTO public.concern_comments (concern_id, roommate_id, comment)
  VALUES (p_concern_id, p_roommate_id, left(btrim(p_comment), 2000))
  RETURNING * INTO v_row;

  INSERT INTO public.concern_events (concern_id, actor_id, event_type, payload)
  VALUES (
    p_concern_id,
    p_roommate_id,
    'commented',
    jsonb_build_object('comment_id', v_row.id)
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_chore_assignment(
  p_assignment_id uuid,
  p_roommate_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_assignment public.chore_assignments;
  v_points integer;
BEGIN
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

  SELECT points INTO v_points
  FROM public.chore_templates
  WHERE id = v_assignment.chore_template_id;

  v_points := COALESCE(v_points, 10);
  IF public.apartment_today() < v_assignment.due_date THEN
    v_points := v_points + 2;
  END IF;

  UPDATE public.chore_assignments
  SET
    status = 'completed',
    completed_at = now(),
    completed_by = p_roommate_id,
    points_awarded = v_points
  WHERE id = p_assignment_id;

  RETURN p_assignment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_due_chore_assignments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_due date;
  v_today date := public.apartment_today();
  v_template public.chore_templates;
  v_count integer := 0;
  v_inserted integer;
  v_n integer;
  v_last uuid;
  v_last_pos integer;
  v_next uuid;
  v_offset integer;
BEGIN
  UPDATE public.chore_assignments
  SET status = 'missed'
  WHERE status = 'pending'
    AND due_date < v_today;

  FOR v_template IN
    SELECT * FROM public.chore_templates WHERE is_active ORDER BY created_at
  LOOP
    IF v_template.frequency = 'monthly' THEN
      v_due := (date_trunc('month', v_today::timestamp) + interval '1 month' - interval '1 day')::date;
    ELSE
      v_due := v_today + ((7 - EXTRACT(DOW FROM v_today)::integer) % 7);
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.chore_assignments
      WHERE chore_template_id = v_template.id
        AND due_date = v_due
    ) THEN
      CONTINUE;
    END IF;

    SELECT COUNT(*)::integer
    INTO v_n
    FROM public.chore_rotations cr
    JOIN public.roommates r ON r.id = cr.roommate_id AND r.is_active
    WHERE cr.chore_template_id = v_template.id;

    IF v_n < 1 THEN
      CONTINUE;
    END IF;

    v_last := NULL;
    v_last_pos := NULL;
    v_next := NULL;

    SELECT a.assigned_to
    INTO v_last
    FROM public.chore_assignments a
    WHERE a.chore_template_id = v_template.id
    ORDER BY a.due_date DESC, a.created_at DESC
    LIMIT 1;

    IF v_last IS NULL THEN
      SELECT COUNT(*)::integer
      INTO v_offset
      FROM public.chore_templates
      WHERE created_at < v_template.created_at;

      SELECT cr.roommate_id
      INTO v_next
      FROM public.chore_rotations cr
      JOIN public.roommates r ON r.id = cr.roommate_id AND r.is_active
      WHERE cr.chore_template_id = v_template.id
      ORDER BY cr.rotation_position
      OFFSET (v_offset % v_n)
      LIMIT 1;
    ELSE
      SELECT cr.rotation_position
      INTO v_last_pos
      FROM public.chore_rotations cr
      WHERE cr.chore_template_id = v_template.id
        AND cr.roommate_id = v_last;

      SELECT cr.roommate_id
      INTO v_next
      FROM public.chore_rotations cr
      JOIN public.roommates r ON r.id = cr.roommate_id AND r.is_active
      WHERE cr.chore_template_id = v_template.id
        AND (v_last_pos IS NULL OR cr.rotation_position > v_last_pos)
      ORDER BY cr.rotation_position
      LIMIT 1;

      IF v_next IS NULL THEN
        SELECT cr.roommate_id
        INTO v_next
        FROM public.chore_rotations cr
        JOIN public.roommates r ON r.id = cr.roommate_id AND r.is_active
        WHERE cr.chore_template_id = v_template.id
        ORDER BY cr.rotation_position
        LIMIT 1;
      END IF;
    END IF;

    IF v_next IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.chore_assignments (
      chore_template_id, assigned_to, due_date, status
    ) VALUES (
      v_template.id, v_next, v_due, 'pending'
    )
    ON CONFLICT (chore_template_id, due_date) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    v_count := v_count + v_inserted;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_inventory_item(text, numeric, text, text, text, text, uuid, date, numeric, boolean, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_chore_with_rotation(text, text, integer, text, uuid, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.save_recipe(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.concern_status_allowed(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_concern(text, text, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_concern(uuid, text, uuid, boolean, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_concern_comment(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_chore_assignment(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_due_chore_assignments() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apartment_balances() FROM PUBLIC, anon, authenticated;
