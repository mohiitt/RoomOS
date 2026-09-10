CREATE TABLE public.recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_by uuid REFERENCES public.roommates(id),
  category text,
  split_type text NOT NULL DEFAULT 'equal',
  frequency text NOT NULL DEFAULT 'monthly',
  next_run_at date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurring_expenses_split_type_check
    CHECK (split_type IN ('equal', 'exact', 'percentage', 'shares')),
  CONSTRAINT recurring_expenses_frequency_check
    CHECK (frequency IN ('weekly', 'monthly', 'custom'))
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  paid_by uuid NOT NULL REFERENCES public.roommates(id),
  category text,
  split_type text NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_rule_id uuid REFERENCES public.recurring_expenses(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.roommates(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expenses_split_type_check
    CHECK (split_type IN ('equal', 'exact', 'percentage', 'shares'))
);

CREATE TABLE public.expense_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  roommate_id uuid NOT NULL REFERENCES public.roommates(id),
  owed_amount numeric(12,2) NOT NULL CHECK (owed_amount >= 0),
  percentage numeric(6,3),
  shares numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (expense_id, roommate_id)
);

CREATE TABLE public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id uuid NOT NULL REFERENCES public.roommates(id),
  receiver_id uuid NOT NULL REFERENCES public.roommates(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  settled_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_by uuid REFERENCES public.roommates(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settlements_parties_check CHECK (payer_id <> receiver_id)
);

CREATE INDEX expenses_expense_date_idx ON public.expenses (expense_date DESC);
CREATE INDEX expense_splits_roommate_id_idx ON public.expense_splits (roommate_id);
CREATE INDEX settlements_payer_id_idx ON public.settlements (payer_id);
CREATE INDEX settlements_receiver_id_idx ON public.settlements (receiver_id);
CREATE INDEX recurring_expenses_next_run_at_idx ON public.recurring_expenses (next_run_at)
  WHERE is_active;

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_all" ON public.expenses
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "expense_splits_all" ON public.expense_splits
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "settlements_all" ON public.settlements
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "recurring_expenses_all" ON public.recurring_expenses
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_splits TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.settlements TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_expenses TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_expense(
  p_id uuid,
  p_title text,
  p_description text,
  p_amount numeric,
  p_paid_by uuid,
  p_category text,
  p_split_type text,
  p_expense_date date,
  p_created_by uuid,
  p_splits jsonb,
  p_is_recurring boolean DEFAULT false,
  p_recurring_rule_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_sum numeric;
  v_split jsonb;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  IF jsonb_typeof(p_splits) <> 'array' OR jsonb_array_length(p_splits) < 1 THEN
    RAISE EXCEPTION 'Choose at least one roommate';
  END IF;

  SELECT COALESCE(SUM((s->>'owed_amount')::numeric), 0)
  INTO v_sum
  FROM jsonb_array_elements(p_splits) AS s;

  IF round(v_sum, 2) <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Split total must equal the expense amount';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.expenses (
      title, description, amount, paid_by, category, split_type, expense_date,
      created_by, is_recurring, recurring_rule_id
    ) VALUES (
      p_title, p_description, p_amount, p_paid_by, p_category, p_split_type, p_expense_date,
      p_created_by, COALESCE(p_is_recurring, false), p_recurring_rule_id
    )
    RETURNING id INTO v_id;
  ELSE
    v_id := p_id;
    UPDATE public.expenses
    SET
      title = p_title,
      description = p_description,
      amount = p_amount,
      paid_by = p_paid_by,
      category = p_category,
      split_type = p_split_type,
      expense_date = p_expense_date
    WHERE id = v_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Expense not found';
    END IF;

    DELETE FROM public.expense_splits WHERE expense_id = v_id;
  END IF;

  FOR v_split IN SELECT value FROM jsonb_array_elements(p_splits)
  LOOP
    INSERT INTO public.expense_splits (
      expense_id, roommate_id, owed_amount, percentage, shares
    ) VALUES (
      v_id,
      (v_split->>'roommate_id')::uuid,
      (v_split->>'owed_amount')::numeric,
      NULLIF(v_split->>'percentage', '')::numeric,
      NULLIF(v_split->>'shares', '')::numeric
    );
  END LOOP;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_settlement(
  p_payer_id uuid,
  p_receiver_id uuid,
  p_amount numeric,
  p_note text,
  p_created_by uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_payer_id = p_receiver_id THEN
    RAISE EXCEPTION 'Payer and receiver must be different people';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  INSERT INTO public.settlements (payer_id, receiver_id, amount, note, created_by)
  VALUES (p_payer_id, p_receiver_id, p_amount, p_note, p_created_by)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
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
  v_amount numeric;
  v_roommates uuid[];
  v_n integer;
  v_cents integer;
  v_base integer;
  v_rem integer;
  v_splits jsonb;
  v_i integer;
  v_share numeric;
BEGIN
  FOR v_rule IN
    SELECT * FROM public.recurring_expenses
    WHERE is_active AND next_run_at <= CURRENT_DATE
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
    WHILE v_rule.next_run_at <= CURRENT_DATE AND v_loops < 24 LOOP
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

      PERFORM public.save_expense(
        NULL,
        v_rule.title,
        NULL,
        v_amount,
        v_rule.paid_by,
        v_rule.category,
        'equal',
        v_rule.next_run_at,
        v_rule.paid_by,
        v_splits,
        true,
        v_rule.id
      );

      IF v_rule.frequency = 'weekly' THEN
        v_rule.next_run_at := v_rule.next_run_at + 7;
      ELSE
        v_rule.next_run_at := (v_rule.next_run_at + interval '1 month')::date;
      END IF;

      v_count := v_count + 1;
      v_loops := v_loops + 1;
    END LOOP;

    UPDATE public.recurring_expenses
    SET next_run_at = v_rule.next_run_at
    WHERE id = v_rule.id;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_expense(uuid, text, text, numeric, uuid, text, text, date, uuid, jsonb, boolean, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_settlement(uuid, uuid, numeric, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_due_recurring_expenses() TO anon, authenticated;
