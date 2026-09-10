CREATE TABLE public.roommates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX roommates_is_active_idx ON public.roommates (is_active);

ALTER TABLE public.roommates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roommates_select" ON public.roommates
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "roommates_update" ON public.roommates
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

REVOKE DELETE ON public.roommates FROM anon, authenticated;
REVOKE INSERT ON public.roommates FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.roommates TO anon, authenticated;
