CREATE OR REPLACE FUNCTION public.insert_notifications(
  p_roommate_ids uuid[],
  p_type text,
  p_title text,
  p_message text,
  p_entity_type text,
  p_entity_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF p_roommate_ids IS NULL OR cardinality(p_roommate_ids) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    roommate_id, type, title, message, entity_type, entity_id
  )
  SELECT DISTINCT recipient_id, p_type, p_title, p_message, p_entity_type, p_entity_id
  FROM unnest(p_roommate_ids) AS recipient_id
  WHERE recipient_id IS NOT NULL
    AND p_entity_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications existing
      WHERE existing.roommate_id = recipient_id
        AND existing.type = p_type
        AND existing.entity_id = p_entity_id
        AND existing.is_read = false
    );
EXCEPTION
  WHEN unique_violation THEN
    NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_active_roommates(
  p_type text,
  p_title text,
  p_message text,
  p_entity_type text,
  p_entity_id uuid,
  p_exclude uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notifications (
    roommate_id, type, title, message, entity_type, entity_id
  )
  SELECT r.id, p_type, p_title, p_message, p_entity_type, p_entity_id
  FROM public.roommates r
  WHERE r.is_active
    AND (p_exclude IS NULL OR r.id <> p_exclude)
    AND p_entity_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications existing
      WHERE existing.roommate_id = r.id
        AND existing.type = p_type
        AND existing.entity_id = p_entity_id
        AND existing.is_read = false
    );
EXCEPTION
  WHEN unique_violation THEN
    NULL;
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
BEGIN
  INSERT INTO public.notifications (
    roommate_id, type, title, message, entity_type, entity_id
  )
  SELECT
    r.id,
    'inventory_expiring',
    'Food to watch',
    CASE
      WHEN i.expiry_date < CURRENT_DATE THEN i.name || ' is expired'
      WHEN i.expiry_date = CURRENT_DATE THEN i.name || ' expires today'
      WHEN i.expiry_date = CURRENT_DATE + 1 THEN i.name || ' expires tomorrow'
      ELSE i.name || ' expires soon'
    END,
    'inventory_item',
    i.id
  FROM public.inventory_items i
  CROSS JOIN public.roommates r
  WHERE r.is_active
    AND i.quantity > 0
    AND i.expiry_date IS NOT NULL
    AND i.expiry_date <= (CURRENT_DATE + 3)
    AND (i.ownership_type = 'shared' OR i.owner_id = r.id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications existing
      WHERE existing.roommate_id = r.id
        AND existing.type = 'inventory_expiring'
        AND existing.entity_id = i.id
        AND existing.is_read = false
    );
  GET DIAGNOSTICS v_expiring = ROW_COUNT;

  INSERT INTO public.notifications (
    roommate_id, type, title, message, entity_type, entity_id
  )
  SELECT
    a.assigned_to,
    'chore_due',
    'Chore due',
    COALESCE(t.name, 'A chore') || ' is due',
    'chore_assignment',
    a.id
  FROM public.chore_assignments a
  LEFT JOIN public.chore_templates t ON t.id = a.chore_template_id
  JOIN public.roommates r ON r.id = a.assigned_to AND r.is_active
  WHERE a.status = 'pending'
    AND a.due_date <= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications existing
      WHERE existing.roommate_id = a.assigned_to
        AND existing.type = 'chore_due'
        AND existing.entity_id = a.id
        AND existing.is_read = false
    );
  GET DIAGNOSTICS v_due = ROW_COUNT;

  RETURN v_expiring + v_due;
EXCEPTION
  WHEN unique_violation THEN
    RETURN 0;
END;
$$;
