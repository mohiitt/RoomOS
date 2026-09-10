export type RecipeIngredientInput = {
  name: string;
  quantity: string;
  unit: string;
};

export function formatIngredient(ingredient: RecipeIngredientInput): string {
  const name = ingredient.name.trim();
  const quantity = ingredient.quantity.trim();
  const unit = ingredient.unit.trim();
  const amount = [quantity, unit].filter(Boolean).join(" ");
  if (!amount) return name;
  return `${amount} ${name}`.trim();
}

export function cleanIngredients(rows: readonly RecipeIngredientInput[]): RecipeIngredientInput[] {
  return rows
    .map((row) => ({
      name: row.name.trim(),
      quantity: row.quantity.trim(),
      unit: row.unit.trim(),
    }))
    .filter((row) => row.name.length > 0);
}
