CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  instructions text NOT NULL,
  created_by uuid REFERENCES public.roommates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recipes_name_check CHECK (char_length(btrim(name)) > 0),
  CONSTRAINT recipes_instructions_check CHECK (char_length(btrim(instructions)) > 0)
);

CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity text NOT NULL,
  unit text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT recipe_ingredients_name_check CHECK (char_length(btrim(name)) > 0),
  CONSTRAINT recipe_ingredients_quantity_check CHECK (char_length(btrim(quantity)) > 0)
);

CREATE INDEX recipes_created_at_idx ON public.recipes (created_at DESC);
CREATE INDEX recipe_ingredients_recipe_id_idx ON public.recipe_ingredients (recipe_id, sort_order);

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipes_all" ON public.recipes
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "recipe_ingredients_all" ON public.recipe_ingredients
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ingredients TO anon, authenticated;

DROP TRIGGER IF EXISTS roomos_realtime_recipes ON public.recipes;
CREATE TRIGGER roomos_realtime_recipes
  AFTER INSERT OR UPDATE OR DELETE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();

DROP TRIGGER IF EXISTS roomos_realtime_recipe_ingredients ON public.recipe_ingredients;
CREATE TRIGGER roomos_realtime_recipe_ingredients
  AFTER INSERT OR UPDATE OR DELETE ON public.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.publish_roomos_change();
