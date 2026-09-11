CREATE OR REPLACE FUNCTION public.apartment_today()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT (timezone('America/Los_Angeles', now()))::date;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS expenses_recurring_once_idx
  ON public.expenses (recurring_rule_id, expense_date)
  WHERE recurring_rule_id IS NOT NULL;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS push_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS push_leased_until timestamptz,
  ADD COLUMN IF NOT EXISTS push_last_error text;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_idx
  ON public.notifications (roommate_id, dedupe_key);

CREATE INDEX IF NOT EXISTS expense_splits_expense_idx ON public.expense_splits (expense_id);
CREATE INDEX IF NOT EXISTS expense_splits_roommate_idx ON public.expense_splits (roommate_id);
CREATE INDEX IF NOT EXISTS settlements_payer_idx ON public.settlements (payer_id);
CREATE INDEX IF NOT EXISTS settlements_receiver_idx ON public.settlements (receiver_id);
CREATE INDEX IF NOT EXISTS notifications_roommate_unread_idx
  ON public.notifications (roommate_id, is_read, created_at DESC);

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
    UNION ALL
    SELECT s.roommate_id, -round(s.owed_amount * 100)
    FROM public.expense_splits s
    UNION ALL
    SELECT st.payer_id, round(st.amount * 100)
    FROM public.settlements st
    UNION ALL
    SELECT st.receiver_id, -round(st.amount * 100)
    FROM public.settlements st
  )
  SELECT n.roommate_id, round(sum(n.cents) / 100.0, 2) AS net
  FROM nets n
  JOIN public.roommates r ON r.id = n.roommate_id AND r.is_active
  GROUP BY n.roommate_id;
$$;

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
      v_cents := round(v_amount * 100)::integer;
      v_base := v_cents / v_n;
      v_rem := v_cents - (v_base * v_n);
      v_splits := '[]'::jsonb;

      FOR v_i IN 1..v_n LOOP
        v_share := (v_base + CASE WHEN v_i <= v_rem THEN 1 ELSE 0 END) / 100.0;
        v_splits := v_splits || jsonb_build_array(jsonb_build_object(
          'roommate_id', v_roommates[v_i],
          'owed_amount', v_share,
          'percentage', NULL,
          'shares', NULL
        ));
      END LOOP;

      BEGIN
        PERFORM public.save_expense(
          NULL,
          v_rule.title,
          NULL,
          v_amount,
          v_rule.paid_by,
          v_rule.category,
          'equal',
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

CREATE OR REPLACE FUNCTION public.generate_time_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_expiring integer := 0;
  v_due integer := 0;
  v_today date := public.apartment_today();
BEGIN
  INSERT INTO public.notifications (
    roommate_id, type, title, message, entity_type, entity_id, dedupe_key
  )
  SELECT
    r.id,
    'inventory_expiring',
    'Food to watch',
    CASE
      WHEN i.expiry_date < v_today THEN i.name || ' is expired'
      WHEN i.expiry_date = v_today THEN i.name || ' expires today'
      WHEN i.expiry_date = v_today + 1 THEN i.name || ' expires tomorrow'
      ELSE i.name || ' expires soon'
    END,
    'inventory_item',
    i.id,
    'inventory_expiring:' || i.id::text || ':' || i.expiry_date::text
  FROM public.inventory_items i
  CROSS JOIN public.roommates r
  WHERE r.is_active
    AND i.quantity > 0
    AND i.expiry_date IS NOT NULL
    AND i.expiry_date <= (v_today + 3)
    AND (i.ownership_type = 'shared' OR i.owner_id = r.id)
  ON CONFLICT (roommate_id, dedupe_key) DO NOTHING;
  GET DIAGNOSTICS v_expiring = ROW_COUNT;

  INSERT INTO public.notifications (
    roommate_id, type, title, message, entity_type, entity_id, dedupe_key
  )
  SELECT
    a.assigned_to,
    'chore_due',
    'Chore due',
    COALESCE(t.name, 'A chore') || ' is due',
    'chore_assignment',
    a.id,
    'chore_due:' || a.id::text
  FROM public.chore_assignments a
  LEFT JOIN public.chore_templates t ON t.id = a.chore_template_id
  JOIN public.roommates r ON r.id = a.assigned_to AND r.is_active
  WHERE a.status = 'pending'
    AND a.due_date <= v_today
  ON CONFLICT (roommate_id, dedupe_key) DO NOTHING;
  GET DIAGNOSTICS v_due = ROW_COUNT;

  RETURN v_expiring + v_due;
EXCEPTION
  WHEN unique_violation THEN
    RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_push_notifications()
RETURNS SETOF public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT n.id
    FROM public.notifications n
    WHERE n.push_dispatched_at IS NULL
      AND n.push_attempts < 8
      AND (n.push_leased_until IS NULL OR n.push_leased_until < now())
      AND n.type IN (
        'expense_added',
        'inventory_expiring',
        'chore_due',
        'chore_assigned',
        'concern_created',
        'concern_assigned'
      )
      AND n.created_at > now() - interval '48 hours'
    ORDER BY n.created_at ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.notifications n
  SET
    push_leased_until = now() + interval '5 minutes',
    push_attempts = n.push_attempts + 1
  FROM claimed
  WHERE n.id = claimed.id
  RETURNING n.*;
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
  v_due := v_today + ((7 - EXTRACT(DOW FROM v_today)::integer) % 7);

  UPDATE public.chore_assignments
  SET status = 'missed'
  WHERE status = 'pending'
    AND due_date < v_today;

  FOR v_template IN
    SELECT * FROM public.chore_templates WHERE is_active ORDER BY created_at
  LOOP
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

CREATE OR REPLACE FUNCTION public.ack_push_notification(p_id uuid, p_error text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF p_error IS NULL THEN
    UPDATE public.notifications
    SET push_dispatched_at = now(), push_leased_until = NULL, push_last_error = NULL
    WHERE id = p_id;
  ELSE
    UPDATE public.notifications
    SET push_last_error = left(p_error, 200), push_leased_until = now() + (interval '1 minute' * LEAST(push_attempts, 8))
    WHERE id = p_id;
  END IF;
END;
$$;
