import Link from "next/link";
import { cn } from "@/lib/utils";

export function FoodTabs({ tab }: { tab: "fridge" | "recipes" }) {
  return (
    <nav className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1" role="tablist" aria-label="Food">
      <Link
        href="/inventory"
        role="tab"
        aria-selected={tab === "fridge"}
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
        role="tab"
        aria-selected={tab === "recipes"}
      >
        Recipes
      </Link>
    </nav>
  );
}
