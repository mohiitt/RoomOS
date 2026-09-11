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
import { createShoppingItem } from "@/lib/shopping/queries.ts";
import type { RecipeWithIngredients } from "@/types/database";

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { roommate, roommates } = useRoommate();
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

  async function onShop() {
    if (!recipe || !roommate) return;
    setBusy(true);
    try {
      for (const ingredient of recipe.ingredients) {
        await createShoppingItem({
          name: ingredient.name,
          requested_quantity: Number(ingredient.quantity) || null,
          unit: ingredient.unit || null,
          reason: "planned",
          added_by: roommate.id,
        });
      }
      toast.success("Ingredients added to shopping");
    } catch (shopError) {
      toast.error(shopError instanceof Error ? shopError.message : "Could not add to shopping");
    } finally {
      setBusy(false);
    }
  }

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
        <PageHeader title="Recipe" backHref="/inventory?tab=recipes" />
        <p className="text-sm text-destructive">{error ?? "Recipe not found."}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={recipe.name}
        subtitle={author ? `Added by ${author.name}` : undefined}
        backHref="/inventory?tab=recipes"
      />

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
        size="lg"
        className="mt-4 min-h-11 w-full"
        disabled={busy}
        onClick={() => void onShop()}
      >
        Add missing ingredients to shopping
      </Button>
      <Link
        href={`/recipes/${recipe.id}/edit`}
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-medium"
      >
        Edit recipe
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="mt-2 min-h-11 w-full"
        disabled={busy}
        onClick={() => void onDelete()}
      >
        Delete recipe
      </Button>
    </div>
  );
}
