"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { useRealtimeRecipes } from "@/hooks/useRealtime.ts";
import { formatIngredient } from "@/lib/recipes/format.ts";
import { deleteRecipe, getRecipe } from "@/lib/recipes/queries.ts";
import type { RecipeWithIngredients } from "@/types/database";

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { roommates } = useRoommate();
  const [recipe, setRecipe] = useState<RecipeWithIngredients | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    void getRecipe(params.id)
      .then(setRecipe)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load recipe");
        setRecipe(null);
      });
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtimeRecipes(load);

  const author = roommates.find((person) => person.id === recipe?.created_by);

  async function onDelete() {
    if (!recipe) return;
    setBusy(true);
    try {
      await deleteRecipe(recipe.id);
      toast.success("Recipe deleted");
      router.push("/inventory?tab=recipes");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  if (!recipe && !error) return <LoadingSkeleton />;

  if (error || !recipe) {
    return (
      <div>
        <PageHeader title="Recipe" />
        <p className="text-sm text-destructive">{error ?? "Recipe not found."}</p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/inventory?tab=recipes"
        className="mb-3 inline-block text-sm font-medium text-primary"
      >
        Back to recipes
      </Link>
      <PageHeader title={recipe.name} subtitle={author ? `Added by ${author.name}` : undefined} />

      <section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="text-sm font-medium text-muted-foreground">Ingredients</h2>
        <ul className="mt-3 grid gap-2">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id} className="text-base">
              {formatIngredient(ingredient)}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="text-sm font-medium text-muted-foreground">How to cook</h2>
        <p className="mt-3 whitespace-pre-wrap text-base leading-7">{recipe.instructions}</p>
      </section>

      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="mt-4 min-h-11 w-full"
        disabled={busy}
        onClick={() => void onDelete()}
      >
        Delete recipe
      </Button>
    </div>
  );
}
