CREATE TABLE public.concerns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  reported_by uuid REFERENCES public.roommates(id),
  assigned_to uuid REFERENCES public.roommates(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT concerns_priority_check
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT concerns_status_check
    CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved'))
);

CREATE TABLE public.concern_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concern_id uuid NOT NULL REFERENCES public.concerns(id) ON DELETE CASCADE,
  roommate_id uuid REFERENCES public.roommates(id),
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.concern_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concern_id uuid NOT NULL REFERENCES public.concerns(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  storage_url text NOT NULL,
  uploaded_by uuid REFERENCES public.roommates(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX concerns_status_idx ON public.concerns (status, created_at DESC);
CREATE INDEX concerns_assigned_to_idx ON public.concerns (assigned_to);
CREATE INDEX concern_comments_concern_id_idx
  ON public.concern_comments (concern_id, created_at);
CREATE INDEX concern_attachments_concern_id_idx
  ON public.concern_attachments (concern_id, created_at);

CREATE TRIGGER concerns_updated_at
  BEFORE UPDATE ON public.concerns
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concern_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concern_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "concerns_all" ON public.concerns
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "concern_comments_all" ON public.concern_comments
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "concern_attachments_all" ON public.concern_attachments
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.concerns TO anon, authenticated;
GRANT SELECT, INSERT ON public.concern_comments TO anon, authenticated;
GRANT SELECT, INSERT ON public.concern_attachments TO anon, authenticated;
REVOKE DELETE ON public.concerns FROM anon, authenticated;
REVOKE DELETE ON public.concern_comments FROM anon, authenticated;
REVOKE DELETE ON public.concern_attachments FROM anon, authenticated;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY concern_photos_select ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket = 'concern-photos');

CREATE POLICY concern_photos_insert ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket = 'concern-photos');

GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT, INSERT ON storage.objects TO anon, authenticated;
