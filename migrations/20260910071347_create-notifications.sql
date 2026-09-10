CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roommate_id uuid NOT NULL REFERENCES public.roommates(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  entity_type text,
  entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_type_check
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
      'shopping_added'
    ))
);

CREATE INDEX notifications_roommate_unread_idx
  ON public.notifications (roommate_id, is_read, created_at DESC);

CREATE UNIQUE INDEX notifications_unread_entity_idx
  ON public.notifications (roommate_id, type, entity_id)
  WHERE entity_id IS NOT NULL AND is_read = false;

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
  ON CONFLICT (roommate_id, type, entity_id) WHERE is_read = false
  DO NOTHING;
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
  ON CONFLICT (roommate_id, type, entity_id) WHERE is_read = false
  DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  PERFORM public.notify_active_roommates(
    'expense_added',
    'New expense',
    NEW.title || ' · $' || trim(to_char(NEW.amount, 'FM999999990.00')),
    'expense',
    NEW.id,
    COALESCE(NEW.created_by, NEW.paid_by)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_settlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  PERFORM public.insert_notifications(
    ARRAY_REMOVE(ARRAY[NEW.payer_id, NEW.receiver_id], NEW.created_by),
    'settlement_added',
    'Settlement recorded',
    '$' || trim(to_char(NEW.amount, 'FM999999990.00')) || ' was settled',
    'settlement',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_shopping_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'needed' AND NEW.reason IN ('manual', 'planned') THEN
    PERFORM public.notify_active_roommates(
      'shopping_added',
      'Shopping list',
      NEW.name || ' was added',
      'shopping_item',
      NEW.id,
      NEW.added_by
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_inventory_attention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_was_low boolean := false;
  v_is_low boolean := false;
  v_expiring boolean := false;
  v_expiry_message text;
BEGIN
  v_is_low := NEW.minimum_quantity IS NOT NULL AND NEW.quantity <= NEW.minimum_quantity;
  IF TG_OP = 'UPDATE' THEN
    v_was_low := OLD.minimum_quantity IS NOT NULL AND OLD.quantity <= OLD.minimum_quantity;
  END IF;

  IF v_is_low AND NOT v_was_low THEN
    IF NEW.ownership_type = 'personal' AND NEW.owner_id IS NOT NULL THEN
      PERFORM public.insert_notifications(
        ARRAY[NEW.owner_id],
        'inventory_low',
        'Low stock',
        NEW.name || ' is running low',
        'inventory_item',
        NEW.id
      );
    ELSE
      PERFORM public.notify_active_roommates(
        'inventory_low',
        'Low stock',
        NEW.name || ' is running low',
        'inventory_item',
        NEW.id,
        NULL
      );
    END IF;
  END IF;

  v_expiring :=
    NEW.quantity > 0
    AND NEW.expiry_date IS NOT NULL
    AND NEW.expiry_date <= (CURRENT_DATE + 3);

  IF v_expiring AND (
    TG_OP = 'INSERT'
    OR OLD.expiry_date IS DISTINCT FROM NEW.expiry_date
  ) THEN
    v_expiry_message := CASE
      WHEN NEW.expiry_date < CURRENT_DATE THEN NEW.name || ' is expired'
      WHEN NEW.expiry_date = CURRENT_DATE THEN NEW.name || ' expires today'
      WHEN NEW.expiry_date = CURRENT_DATE + 1 THEN NEW.name || ' expires tomorrow'
      ELSE NEW.name || ' expires soon'
    END;

    IF NEW.ownership_type = 'personal' AND NEW.owner_id IS NOT NULL THEN
      PERFORM public.insert_notifications(
        ARRAY[NEW.owner_id],
        'inventory_expiring',
        'Food to watch',
        v_expiry_message,
        'inventory_item',
        NEW.id
      );
    ELSE
      PERFORM public.notify_active_roommates(
        'inventory_expiring',
        'Food to watch',
        v_expiry_message,
        'inventory_item',
        NEW.id,
        NULL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_chore_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_name text;
BEGIN
  SELECT t.name INTO v_name
  FROM public.chore_templates t
  WHERE t.id = NEW.chore_template_id;

  PERFORM public.insert_notifications(
    ARRAY[NEW.assigned_to],
    'chore_assigned',
    'Your chore',
    COALESCE(v_name, 'A chore') || ' is yours this week',
    'chore_assignment',
    NEW.id
  );

  IF NEW.status = 'pending' AND NEW.due_date <= CURRENT_DATE THEN
    PERFORM public.insert_notifications(
      ARRAY[NEW.assigned_to],
      'chore_due',
      'Chore due',
      COALESCE(v_name, 'A chore') || ' is due',
      'chore_assignment',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_concern_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_active_roommates(
      'concern_created',
      'New issue',
      NEW.title,
      'concern',
      NEW.id,
      NEW.reported_by
    );

    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM NEW.reported_by THEN
      PERFORM public.insert_notifications(
        ARRAY[NEW.assigned_to],
        'concern_assigned',
        'Issue assigned to you',
        NEW.title,
        'concern',
        NEW.id
      );
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    PERFORM public.insert_notifications(
      ARRAY[NEW.assigned_to],
      'concern_assigned',
      'Issue assigned to you',
      NEW.title,
      'concern',
      NEW.id
    );
  END IF;

  IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    PERFORM public.insert_notifications(
      ARRAY[NEW.reported_by, NEW.assigned_to],
      'concern_resolved',
      'Issue resolved',
      NEW.title,
      'concern',
      NEW.id
    );
  END IF;

  RETURN NEW;
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
  ON CONFLICT (roommate_id, type, entity_id) WHERE is_read = false
  DO NOTHING;
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
  ON CONFLICT (roommate_id, type, entity_id) WHERE is_read = false
  DO NOTHING;
  GET DIAGNOSTICS v_due = ROW_COUNT;

  RETURN v_expiring + v_due;
END;
$$;

DROP TRIGGER IF EXISTS notifications_expense_added ON public.expenses;
CREATE TRIGGER notifications_expense_added
  AFTER INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_expense();

DROP TRIGGER IF EXISTS notifications_settlement_added ON public.settlements;
CREATE TRIGGER notifications_settlement_added
  AFTER INSERT ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_settlement();

DROP TRIGGER IF EXISTS notifications_shopping_added ON public.shopping_items;
CREATE TRIGGER notifications_shopping_added
  AFTER INSERT ON public.shopping_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_shopping_item();

DROP TRIGGER IF EXISTS notifications_inventory_attention ON public.inventory_items;
CREATE TRIGGER notifications_inventory_attention
  AFTER INSERT OR UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_inventory_attention();

DROP TRIGGER IF EXISTS notifications_chore_assigned ON public.chore_assignments;
CREATE TRIGGER notifications_chore_assigned
  AFTER INSERT ON public.chore_assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_chore_assignment();

DROP TRIGGER IF EXISTS notifications_concern_change ON public.concerns;
CREATE TRIGGER notifications_concern_change
  AFTER INSERT OR UPDATE ON public.concerns
  FOR EACH ROW EXECUTE FUNCTION public.notify_concern_change();

DROP TRIGGER IF EXISTS roomos_realtime_notifications ON public.notifications;
CREATE TRIGGER roomos_realtime_notifications
  AFTER INSERT OR UPDATE OR DELETE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, UPDATE ON public.notifications TO anon, authenticated;
REVOKE INSERT, DELETE ON public.notifications FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_time_notifications() TO anon, authenticated;
