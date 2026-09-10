CREATE TABLE public.chore_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  frequency text NOT NULL DEFAULT 'weekly',
  points integer NOT NULL DEFAULT 10 CHECK (points >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.roommates(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chore_templates_frequency_check
    CHECK (frequency IN ('weekly', 'monthly'))
);

CREATE TABLE public.chore_rotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_template_id uuid NOT NULL REFERENCES public.chore_templates(id) ON DELETE CASCADE,
  roommate_id uuid NOT NULL REFERENCES public.roommates(id),
  rotation_position integer NOT NULL CHECK (rotation_position >= 0),
  UNIQUE (chore_template_id, roommate_id),
  UNIQUE (chore_template_id, rotation_position)
);

CREATE TABLE public.chore_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_template_id uuid NOT NULL REFERENCES public.chore_templates(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL REFERENCES public.roommates(id),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  completed_by uuid REFERENCES public.roommates(id),
  points_awarded integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chore_assignments_status_check
    CHECK (status IN ('pending', 'completed', 'missed', 'skipped')),
  UNIQUE (chore_template_id, due_date)
);

CREATE INDEX chore_assignments_assigned_due_idx
  ON public.chore_assignments (assigned_to, due_date);
CREATE INDEX chore_assignments_status_due_idx
  ON public.chore_assignments (status, due_date);
CREATE INDEX chore_rotations_template_idx
  ON public.chore_rotations (chore_template_id, rotation_position);

ALTER TABLE public.chore_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chore_templates_all" ON public.chore_templates
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "chore_rotations_all" ON public.chore_rotations
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "chore_assignments_all" ON public.chore_assignments
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chore_templates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chore_rotations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chore_assignments TO anon, authenticated;
REVOKE DELETE ON public.chore_assignments FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.generate_due_chore_assignments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_due date;
  v_template public.chore_templates;
  v_count integer := 0;
  v_inserted integer;
  v_n integer;
  v_last uuid;
  v_last_pos integer;
  v_next uuid;
  v_offset integer;
BEGIN
  v_due := CURRENT_DATE + ((7 - EXTRACT(DOW FROM CURRENT_DATE)::integer) % 7);

  UPDATE public.chore_assignments
  SET status = 'missed'
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;

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
  IF CURRENT_DATE < v_assignment.due_date THEN
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

GRANT EXECUTE ON FUNCTION public.generate_due_chore_assignments() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_chore_assignment(uuid, uuid) TO anon, authenticated;
