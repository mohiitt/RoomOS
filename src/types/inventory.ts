export const OWNERSHIP_TYPES = ["shared", "personal"] as const;
export const STORAGE_LOCATIONS = [
  "fridge",
  "freezer",
  "pantry",
  "kitchen",
  "other",
] as const;
export const INVENTORY_CATEGORIES = [
  "vegetables",
  "fruits",
  "dairy",
  "meat",
  "frozen",
  "snacks",
  "grains",
  "spices",
  "beverages",
  "household",
  "other",
] as const;
export const INVENTORY_UNITS = [
  "count",
  "dozen",
  "pack",
  "bag",
  "box",
  "bottle",
  "can",
  "lb",
  "oz",
  "kg",
  "g",
  "L",
  "ml",
  "gal",
] as const;
export const TRANSACTION_TYPES = [
  "consume",
  "add",
  "adjust",
  "purchase",
  "discard",
  "expired",
] as const;

export type OwnershipType = (typeof OWNERSHIP_TYPES)[number];
export type StorageLocation = (typeof STORAGE_LOCATIONS)[number];
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];
export type InventoryUnit = (typeof INVENTORY_UNITS)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type ExpiryStatus = "expired" | "critical" | "expiring" | "ok" | "none";

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string | null;
  storage_location: StorageLocation;
  ownership_type: OwnershipType;
  owner_id: string | null;
  expiry_date: string | null;
  minimum_quantity: number | null;
  auto_add_to_shopping: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryTransaction = {
  id: string;
  inventory_item_id: string;
  roommate_id: string | null;
  transaction_type: TransactionType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  note: string | null;
  created_at: string;
};

export type InventoryFilter =
  | "all"
  | "shared"
  | "mine"
  | "fridge"
  | "freezer"
  | "pantry"
  | "low"
  | "expiring";
