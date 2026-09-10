import Link from "next/link";
import { cn } from "@/lib/utils";

export function FoodTabs({ tab }: { tab: "fridge" | "recipes" }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
      <Link
        href="/inventory"
        className={cn(
          "inline-flex min-h-11 items-center justify-center rounded-full text-sm font-medium",
          tab === "fridge"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground"
        )}
      >
        Fridge
      </Link>
      <Link
        href="/inventory?tab=recipes"
        className={cn(
          "inline-flex min-h-11 items-center justify-center rounded-full text-sm font-medium",
          tab === "recipes"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground"
        )}
      >
        Recipes
      </Link>
    </div>
  );
}
