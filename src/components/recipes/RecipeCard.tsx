import Link from "next/link";
import type { Recipe } from "@/types/database";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border/80 transition active:translate-y-px"
    >
      <h2 className="text-lg font-semibold leading-tight">{recipe.name}</h2>
    </Link>
  );
}
