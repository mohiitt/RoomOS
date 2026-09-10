ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS push_dispatched_at timestamptz;

CREATE INDEX IF NOT EXISTS notifications_push_pending_idx
  ON public.notifications (created_at)
  WHERE push_dispatched_at IS NULL;

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roommate_id uuid NOT NULL REFERENCES public.roommates(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint)
);

CREATE INDEX push_subscriptions_roommate_id_idx
  ON public.push_subscriptions (roommate_id);

CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

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
  SET push_dispatched_at = now()
  FROM claimed
  WHERE n.id = claimed.id
  RETURNING n.*;
END;
$$;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_all" ON public.push_subscriptions
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_push_notifications() TO anon, authenticated;
