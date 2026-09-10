CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  quantity numeric(12,3) NOT NULL CHECK (quantity >= 0),
  unit text NOT NULL,
  category text,
  storage_location text NOT NULL DEFAULT 'other',
  ownership_type text NOT NULL DEFAULT 'shared',
  owner_id uuid REFERENCES public.roommates(id),
  expiry_date date,
  minimum_quantity numeric(12,3) CHECK (minimum_quantity IS NULL OR minimum_quantity >= 0),
  auto_add_to_shopping boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES public.roommates(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_items_ownership_type_check
    CHECK (ownership_type IN ('shared', 'personal')),
  CONSTRAINT inventory_items_storage_location_check
    CHECK (storage_location IN ('fridge', 'freezer', 'pantry', 'kitchen', 'other')),
  CONSTRAINT inventory_items_personal_owner_check
    CHECK (ownership_type = 'shared' OR owner_id IS NOT NULL)
);

CREATE TABLE public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  roommate_id uuid REFERENCES public.roommates(id),
  transaction_type text NOT NULL,
  quantity_change numeric(12,3) NOT NULL,
  quantity_before numeric(12,3) NOT NULL,
  quantity_after numeric(12,3) NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_transactions_type_check
    CHECK (transaction_type IN ('consume', 'add', 'adjust', 'purchase', 'discard', 'expired'))
);

CREATE INDEX inventory_items_expiry_date_idx ON public.inventory_items (expiry_date);
CREATE INDEX inventory_items_category_idx ON public.inventory_items (category);
CREATE INDEX inventory_items_storage_location_idx ON public.inventory_items (storage_location);
CREATE INDEX inventory_items_owner_id_idx ON public.inventory_items (owner_id);
CREATE INDEX inventory_transactions_item_id_idx ON public.inventory_transactions (inventory_item_id, created_at DESC);

CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE OR REPLACE FUNCTION public.adjust_inventory(
  p_item_id uuid,
  p_roommate_id uuid,
  p_transaction_type text,
  p_quantity_change numeric,
  p_note text DEFAULT NULL
) RETURNS public.inventory_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_item public.inventory_items;
  v_before numeric;
  v_after numeric;
BEGIN
  IF p_quantity_change = 0 THEN
    RAISE EXCEPTION 'Quantity change cannot be zero';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;

  v_before := v_item.quantity;
  v_after := v_before + p_quantity_change;

  IF v_after < 0 THEN
    RAISE EXCEPTION 'Insufficient quantity';
  END IF;

  UPDATE public.inventory_items
  SET quantity = v_after
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  INSERT INTO public.inventory_transactions (
    inventory_item_id,
    roommate_id,
    transaction_type,
    quantity_change,
    quantity_before,
    quantity_after,
    note
  ) VALUES (
    p_item_id,
    p_roommate_id,
    p_transaction_type,
    p_quantity_change,
    v_before,
    v_after,
    p_note
  );

  RETURN v_item;
END;
$$;

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_items_all" ON public.inventory_items
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "inventory_transactions_select" ON public.inventory_transactions
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "inventory_transactions_insert" ON public.inventory_transactions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

REVOKE UPDATE, DELETE ON public.inventory_transactions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO anon, authenticated;
GRANT SELECT, INSERT ON public.inventory_transactions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_inventory(uuid, uuid, text, numeric, text) TO anon, authenticated;
