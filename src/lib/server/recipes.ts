import "server-only";
import { getAdminInsforge } from "@/lib/insforge/admin";
import { describeError } from "@/lib/insforge/errors";
import { cleanIngredients, type RecipeIngredientInput } from "@/lib/recipes/format.ts";
import type { Recipe, RecipeIngredient, RecipeWithIngredients } from "@/types/database";

type Raw = Record<string, unknown>;

const RECIPE_COLUMNS = "id, name, instructions, created_by, created_at, updated_at";
const INGREDIENT_COLUMNS = "id, recipe_id, name, quantity, unit, sort_order";

function mapRecipe(row: Raw): Recipe {
  return {
    id: String(row.id),
    name: String(row.name),
    instructions: String(row.instructions ?? ""),
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapIngredient(row: Raw): RecipeIngredient {
  return {
    id: String(row.id),
    recipe_id: String(row.recipe_id),
    name: String(row.name),
    quantity: String(row.quantity),
    unit: String(row.unit ?? ""),
    sort_order: Number(row.sort_order ?? 0),
  };
}

export async function listRecipes(): Promise<Recipe[]> {
  const { data, error } = await getAdminInsforge()
    .database.from("recipes")
    .select("id, name, created_by, created_at, updated_at")
    .order("name", { ascending: true })
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load recipes"));
  return ((data ?? []) as Raw[]).map(mapRecipe);
}

export async function getRecipe(id: string): Promise<RecipeWithIngredients> {
  const client = getAdminInsforge();
  const { data, error } = await client.database
    .from("recipes")
    .select(RECIPE_COLUMNS)
    .eq("id", id)
    .limit(1);

  if (error || !data?.[0]) throw new Error(describeError(error, "Could not load this recipe"));

  const { data: ingredientRows, error: ingredientError } = await client.database
    .from("recipe_ingredients")
    .select(INGREDIENT_COLUMNS)
    .eq("recipe_id", id)
    .order("sort_order", { ascending: true })
    .limit(100);

  if (ingredientError) {
    throw new Error(describeError(ingredientError, "Could not load ingredients"));
  }

  return {
    ...mapRecipe(data[0] as Raw),
    ingredients: ((ingredientRows ?? []) as Raw[]).map(mapIngredient),
  };
}

export async function createRecipe(input: {
  name: string;
  instructions: string;
  createdBy: string;
  ingredients: readonly RecipeIngredientInput[];
}): Promise<Recipe> {
  const name = input.name.trim();
  const instructions = input.instructions.trim();
  const ingredients = cleanIngredients(input.ingredients);

  if (!name) throw new Error("Give the recipe a name");
  if (!instructions) throw new Error("Add a short note on how to cook it");
  if (ingredients.length === 0) throw new Error("Add at least one ingredient");
  if (ingredients.some((row) => !row.quantity)) {
    throw new Error("Every ingredient needs a quantity");
  }

  const { data, error } = await getAdminInsforge().database.rpc("save_recipe", {
    p_name: name,
    p_instructions: instructions,
    p_created_by: input.createdBy,
    p_ingredients: ingredients,
  });

  if (error) throw new Error(describeError(error, "Could not save recipe"));
  const id = Array.isArray(data) ? data[0] : data;
  if (!id) throw new Error("Could not save recipe");
  const recipe = await getRecipe(String(id));
  return recipe;
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await getAdminInsforge().database.from("recipes").delete().eq("id", id);
  if (error) throw new Error(describeError(error, "Could not delete recipe"));
}
