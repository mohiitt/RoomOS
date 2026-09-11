"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { RecipeForm } from "@/components/recipes/RecipeForm";
import type { RecipeFormValues } from "@/components/recipes/RecipeForm";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { getRecipe, updateRecipe } from "@/lib/recipes/queries.ts";
import type { RecipeWithIngredients } from "@/types/database";

export default function EditRecipePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeWithIngredients | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getRecipe(params.id)
      .then(setRecipe)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load recipe");
      });
  }, [params.id]);

  async function onSubmit(values: RecipeFormValues) {
    if (!recipe) return;
    setBusy(true);
    try {
      await updateRecipe({
        id: recipe.id,
        name: values.name,
        instructions: values.instructions,
        ingredients: values.ingredients,
      });
      toast.success("Recipe updated");
      router.push(`/recipes/${recipe.id}`);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (!recipe && !error) return <LoadingSkeleton />;

  return (
    <div>
      <PageHeader title="Edit recipe" subtitle={recipe?.name} backHref={`/recipes/${params.id}`} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {recipe ? (
        <RecipeForm
          busy={busy}
          submitLabel="Save changes"
          initial={{
            name: recipe.name,
            instructions: recipe.instructions,
            ingredients: recipe.ingredients.map((row) => ({
              name: row.name,
              quantity: row.quantity,
              unit: row.unit,
            })),
          }}
          onSubmit={onSubmit}
        />
      ) : null}
    </div>
  );
}
