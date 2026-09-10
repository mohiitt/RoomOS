"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { RecipeForm } from "@/components/recipes/RecipeForm";
import type { RecipeFormValues } from "@/components/recipes/RecipeForm";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { createRecipe } from "@/lib/recipes/queries.ts";

export default function NewRecipePage() {
  const router = useRouter();
  const { roommate } = useRoommate();
  const [busy, setBusy] = useState(false);

  async function onSubmit(values: RecipeFormValues) {
    if (!roommate) return;
    setBusy(true);
    try {
      const recipe = await createRecipe({
        name: values.name,
        instructions: values.instructions,
        createdBy: roommate.id,
        ingredients: values.ingredients,
      });
      toast.success("Recipe saved");
      router.push(`/recipes/${recipe.id}`);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not save recipe");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link
        href="/inventory?tab=recipes"
        className="mb-3 inline-block text-sm font-medium text-primary"
      >
        Back to recipes
      </Link>
      <PageHeader title="New recipe" subtitle="Name, ingredients, and how to cook it." />
      {roommate ? <RecipeForm busy={busy} onSubmit={onSubmit} /> : null}
    </div>
  );
}
