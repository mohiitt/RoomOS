"use client";

import { cn } from "@/lib/utils";
import type { InventoryFilter } from "@/lib/inventory/filterItems";

const FILTERS: { value: InventoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "shared", label: "Shared" },
  { value: "mine", label: "Mine" },
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" },
  { value: "pantry", label: "Pantry" },
  { value: "low", label: "Low Stock" },
  { value: "expiring", label: "Expiring" },
];

export function InventoryFilters({
  value,
  onChange,
}: {
  value: InventoryFilter;
  onChange: (value: InventoryFilter) => void;
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
          className={cn(
            "h-9 shrink-0 rounded-full px-3 text-sm font-medium ring-1",
            value === filter.value
              ? "bg-primary text-primary-foreground ring-primary"
              : "bg-card text-foreground ring-border"
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
