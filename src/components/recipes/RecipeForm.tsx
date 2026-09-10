"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RecipeIngredientInput } from "@/lib/recipes/format.ts";

export type RecipeFormValues = {
  name: string;
  instructions: string;
  ingredients: RecipeIngredientInput[];
};

const emptyIngredient: RecipeIngredientInput = { name: "", quantity: "", unit: "" };

export function RecipeForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (values: RecipeFormValues) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState<RecipeIngredientInput[]>([{ ...emptyIngredient }]);
  const [error, setError] = useState<string | null>(null);

  function updateIngredient(index: number, patch: Partial<RecipeIngredientInput>) {
    setIngredients((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Give the recipe a name.");
      return;
    }
    if (!ingredients.some((row) => row.name.trim())) {
      setError("Add at least one ingredient.");
      return;
    }
    if (ingredients.some((row) => row.name.trim() && !row.quantity.trim())) {
      setError("Every ingredient needs a quantity.");
      return;
    }
    if (!instructions.trim()) {
      setError("Add a short note on how to cook it.");
      return;
    }
    setError(null);
    await onSubmit({ name, instructions, ingredients });
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid gap-2">
        <Label htmlFor="recipe-name">Recipe name</Label>
        <Input
          id="recipe-name"
          className="min-h-12 text-base"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Dal tadka"
        />
      </div>

      <div className="grid gap-2">
        <Label>Ingredients</Label>
        <div className="grid gap-3">
          {ingredients.map((row, index) => (
            <div key={index} className="grid gap-2 rounded-2xl bg-card p-3 ring-1 ring-border">
              <Input
                className="min-h-11 text-base"
                value={row.name}
                onChange={(event) => updateIngredient(index, { name: event.target.value })}
                placeholder="Ingredient"
                aria-label={`Ingredient ${index + 1} name`}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  className="min-h-11 text-base"
                  value={row.quantity}
                  onChange={(event) => updateIngredient(index, { quantity: event.target.value })}
                  placeholder="Qty"
                  aria-label={`Ingredient ${index + 1} quantity`}
                />
                <Input
                  className="min-h-11 text-base"
                  value={row.unit}
                  onChange={(event) => updateIngredient(index, { unit: event.target.value })}
                  placeholder="Unit (cups, pinch…)"
                  aria-label={`Ingredient ${index + 1} unit`}
                />
              </div>
              {ingredients.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-start px-0 text-muted-foreground"
                  onClick={() =>
                    setIngredients((rows) => rows.filter((_, rowIndex) => rowIndex !== index))
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-11"
          onClick={() => setIngredients((rows) => [...rows, { ...emptyIngredient }])}
        >
          Add ingredient
        </Button>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="recipe-instructions">How to cook</Label>
        <Textarea
          id="recipe-instructions"
          className="min-h-32 text-base"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="Boil the dal. Temper cumin and garlic. Mix and serve."
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" size="lg" className="min-h-11" disabled={busy}>
        Save recipe
      </Button>
    </form>
  );
}
