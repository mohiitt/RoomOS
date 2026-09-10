"use client";

import { useCallback, useEffect, useState } from "react";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useRealtimeRecipes } from "@/hooks/useRealtime.ts";
import { copy } from "@/lib/copy";
import { listRecipes } from "@/lib/recipes/queries.ts";
import type { Recipe } from "@/types/database";

export function RecipesList() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    void listRecipes()
      .then(setRecipes)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load recipes");
        setRecipes([]);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtimeRecipes(load);

  if (recipes === null) return <LoadingSkeleton />;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (recipes.length === 0) {
    return (
      <EmptyState title={copy.recipesEmptyTitle} description={copy.recipesEmptyBody} />
    );
  }

  return (
    <div className="grid gap-3 pb-16">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
