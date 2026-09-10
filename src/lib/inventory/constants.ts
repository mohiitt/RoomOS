import type { InventoryCategory, StorageLocation } from "@/types/database";

export const STORAGE_LOCATIONS: { value: StorageLocation; label: string }[] = [
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" },
  { value: "pantry", label: "Pantry" },
  { value: "kitchen", label: "Kitchen" },
  { value: "other", label: "Other" },
];

export const INVENTORY_CATEGORIES: { value: InventoryCategory; label: string }[] =
  [
    { value: "vegetables", label: "Vegetables" },
    { value: "fruits", label: "Fruits" },
    { value: "dairy", label: "Dairy" },
    { value: "meat", label: "Meat" },
    { value: "frozen", label: "Frozen" },
    { value: "snacks", label: "Snacks" },
    { value: "grains", label: "Grains" },
    { value: "spices", label: "Spices" },
    { value: "beverages", label: "Beverages" },
    { value: "household", label: "Household" },
    { value: "other", label: "Other" },
  ];

export const UNITS = [
  "count",
  "dozen",
  "pack",
  "bag",
  "box",
  "bottle",
  "can",
  "lbs",
  "oz",
  "g",
  "kg",
  "gal",
  "L",
  "ml",
  "other",
] as const;

export function labelForLocation(value: string): string {
  return STORAGE_LOCATIONS.find((item) => item.value === value)?.label ?? value;
}

export function labelForCategory(value: string | null): string {
  if (!value) return "Uncategorized";
  return INVENTORY_CATEGORIES.find((item) => item.value === value)?.label ?? value;
}
