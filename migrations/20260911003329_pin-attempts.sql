CREATE TABLE public.pin_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

CREATE INDEX pin_attempts_ip_attempted_at_idx
  ON public.pin_attempts (ip, attempted_at DESC);

ALTER TABLE public.pin_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.pin_attempts FROM PUBLIC;
REVOKE ALL ON TABLE public.pin_attempts FROM anon;
REVOKE ALL ON TABLE public.pin_attempts FROM authenticated;
