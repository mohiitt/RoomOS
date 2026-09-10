CREATE TABLE public.shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  requested_quantity numeric(12,3),
  unit text,
  reason text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'needed',
  added_by uuid REFERENCES public.roommates(id),
  purchased_by uuid REFERENCES public.roommates(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  purchased_at timestamptz,
  CONSTRAINT shopping_items_reason_check
    CHECK (reason IN ('manual', 'low_stock', 'expired', 'planned')),
  CONSTRAINT shopping_items_status_check
    CHECK (status IN ('needed', 'purchased', 'removed')),
  CONSTRAINT shopping_items_requested_quantity_check
    CHECK (requested_quantity IS NULL OR requested_quantity >= 0)
);

CREATE INDEX shopping_items_status_idx ON public.shopping_items (status);
CREATE INDEX shopping_items_inventory_item_id_idx ON public.shopping_items (inventory_item_id);

CREATE UNIQUE INDEX shopping_items_needed_inventory_unique
  ON public.shopping_items (inventory_item_id)
  WHERE status = 'needed' AND inventory_item_id IS NOT NULL;

CREATE UNIQUE INDEX shopping_items_needed_name_unique
  ON public.shopping_items (lower(name))
  WHERE status = 'needed' AND inventory_item_id IS NULL;

ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopping_items_select" ON public.shopping_items
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "shopping_items_insert" ON public.shopping_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "shopping_items_update" ON public.shopping_items
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

REVOKE DELETE ON public.shopping_items FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.shopping_items TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.purchase_shopping_item(
  p_shopping_id uuid,
  p_roommate_id uuid,
  p_quantity numeric
) RETURNS public.shopping_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_item public.shopping_items;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Enter how much you bought';
  END IF;

  SELECT * INTO v_item
  FROM public.shopping_items
  WHERE id = p_shopping_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shopping item not found';
  END IF;

  IF v_item.status <> 'needed' THEN
    RAISE EXCEPTION 'That item is not on the list anymore';
  END IF;

  IF v_item.inventory_item_id IS NOT NULL THEN
    PERFORM public.adjust_inventory(
      v_item.inventory_item_id,
      p_roommate_id,
      'purchase',
      p_quantity,
      'Bought from shopping list'
    );
  END IF;

  UPDATE public.shopping_items
  SET
    status = 'purchased',
    purchased_by = p_roommate_id,
    purchased_at = now(),
    requested_quantity = COALESCE(v_item.requested_quantity, p_quantity)
  WHERE id = p_shopping_id
  RETURNING * INTO v_item;

  RETURN v_item;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_shopping_item(uuid, uuid, numeric) TO anon, authenticated;
