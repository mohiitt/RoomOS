import { describeError, getInsforge } from "../insforge/client.ts";
import { cleanIngredients, type RecipeIngredientInput } from "./format.ts";
import type { Recipe, RecipeIngredient, RecipeWithIngredients } from "../../types/database.ts";

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
  const { data, error } = await getInsforge()
    .database.from("recipes")
    .select("id, name, created_by, created_at, updated_at")
    .order("name", { ascending: true })
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load recipes"));
  return ((data ?? []) as Raw[]).map(mapRecipe);
}

export async function getRecipe(id: string): Promise<RecipeWithIngredients> {
  const client = getInsforge();
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

  const { data, error } = await getInsforge()
    .database.from("recipes")
    .insert([
      {
        name,
        instructions,
        created_by: input.createdBy,
      },
    ])
    .select(RECIPE_COLUMNS);

  if (error || !data?.[0]) throw new Error(describeError(error, "Could not save recipe"));
  const recipe = mapRecipe(data[0] as Raw);

  const { error: ingredientError } = await getInsforge()
    .database.from("recipe_ingredients")
    .insert(
      ingredients.map((row, index) => ({
        recipe_id: recipe.id,
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        sort_order: index,
      }))
    );

  if (ingredientError) {
    await getInsforge().database.from("recipes").delete().eq("id", recipe.id);
    throw new Error(describeError(ingredientError, "Could not save ingredients"));
  }

  return recipe;
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await getInsforge().database.from("recipes").delete().eq("id", id);
  if (error) throw new Error(describeError(error, "Could not delete recipe"));
}
