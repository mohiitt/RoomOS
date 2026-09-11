import { apiJson } from "@/lib/api/browser";
import type { RecipeIngredientInput } from "./format.ts";
import type { Recipe, RecipeWithIngredients } from "../../types/database.ts";

export async function listRecipes(): Promise<Recipe[]> {
  return apiJson<Recipe[]>("/api/recipes");
}

export async function getRecipe(id: string): Promise<RecipeWithIngredients> {
  return apiJson<RecipeWithIngredients>(`/api/recipes/${id}`);
}

export async function createRecipe(input: {
  name: string;
  instructions: string;
  createdBy: string;
  ingredients: readonly RecipeIngredientInput[];
}): Promise<Recipe> {
  return apiJson<Recipe>("/api/recipes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateRecipe(input: {
  id: string;
  name: string;
  instructions: string;
  ingredients: readonly RecipeIngredientInput[];
}): Promise<RecipeWithIngredients> {
  return apiJson<RecipeWithIngredients>(`/api/recipes/${input.id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteRecipe(id: string): Promise<void> {
  await apiJson(`/api/recipes/${id}`, { method: "DELETE" });
}
