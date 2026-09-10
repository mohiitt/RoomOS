INSERT INTO realtime.channels (pattern, description, enabled)
VALUES ('roomos:%', 'Apartment-wide RoomOS updates', true)
ON CONFLICT (pattern) DO UPDATE
SET description = EXCLUDED.description,
    enabled = EXCLUDED.enabled;

CREATE OR REPLACE FUNCTION public.publish_roomos_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, realtime, pg_temp
AS $$
DECLARE
  v_row jsonb;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

  PERFORM realtime.publish(
    'roomos:apartment',
    'roomos_changed',
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'op', TG_OP,
      'id', v_row->>'id'
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS roomos_realtime_inventory_items ON public.inventory_items;
CREATE TRIGGER roomos_realtime_inventory_items
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();

DROP TRIGGER IF EXISTS roomos_realtime_inventory_transactions ON public.inventory_transactions;
CREATE TRIGGER roomos_realtime_inventory_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();

DROP TRIGGER IF EXISTS roomos_realtime_shopping_items ON public.shopping_items;
CREATE TRIGGER roomos_realtime_shopping_items
  AFTER INSERT OR UPDATE OR DELETE ON public.shopping_items
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();

DROP TRIGGER IF EXISTS roomos_realtime_expenses ON public.expenses;
CREATE TRIGGER roomos_realtime_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();

DROP TRIGGER IF EXISTS roomos_realtime_expense_splits ON public.expense_splits;
CREATE TRIGGER roomos_realtime_expense_splits
  AFTER INSERT OR UPDATE OR DELETE ON public.expense_splits
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();

DROP TRIGGER IF EXISTS roomos_realtime_settlements ON public.settlements;
CREATE TRIGGER roomos_realtime_settlements
  AFTER INSERT OR UPDATE OR DELETE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();

DROP TRIGGER IF EXISTS roomos_realtime_recurring_expenses ON public.recurring_expenses;
CREATE TRIGGER roomos_realtime_recurring_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();

DROP TRIGGER IF EXISTS roomos_realtime_chore_templates ON public.chore_templates;
CREATE TRIGGER roomos_realtime_chore_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.chore_templates
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();

DROP TRIGGER IF EXISTS roomos_realtime_chore_assignments ON public.chore_assignments;
CREATE TRIGGER roomos_realtime_chore_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.chore_assignments
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();

DROP TRIGGER IF EXISTS roomos_realtime_concerns ON public.concerns;
CREATE TRIGGER roomos_realtime_concerns
  AFTER INSERT OR UPDATE OR DELETE ON public.concerns
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();

DROP TRIGGER IF EXISTS roomos_realtime_concern_comments ON public.concern_comments;
CREATE TRIGGER roomos_realtime_concern_comments
  AFTER INSERT OR UPDATE OR DELETE ON public.concern_comments
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();

DROP TRIGGER IF EXISTS roomos_realtime_concern_attachments ON public.concern_attachments;
CREATE TRIGGER roomos_realtime_concern_attachments
  AFTER INSERT OR UPDATE OR DELETE ON public.concern_attachments
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();

ALTER TABLE realtime.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roomos_channels_select ON realtime.channels;
CREATE POLICY roomos_channels_select ON realtime.channels
  FOR SELECT TO anon, authenticated
  USING (pattern = 'roomos:%');

DROP POLICY IF EXISTS roomos_messages_select ON realtime.messages;
CREATE POLICY roomos_messages_select ON realtime.messages
  FOR SELECT TO anon, authenticated
  USING (channel_name LIKE 'roomos:%');

GRANT USAGE ON SCHEMA realtime TO anon, authenticated;
GRANT SELECT ON realtime.channels TO anon, authenticated;
GRANT SELECT ON realtime.messages TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_roomos_change() TO anon, authenticated;
