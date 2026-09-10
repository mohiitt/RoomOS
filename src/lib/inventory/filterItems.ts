import type { InventoryItem } from "@/types/database";
import { getExpiryStatus, isExpiring } from "@/lib/inventory/checkExpiry";
import { isLowStock } from "@/lib/inventory/checkLowStock";

export type InventoryFilter =
  | "all"
  | "shared"
  | "mine"
  | "fridge"
  | "freezer"
  | "pantry"
  | "low"
  | "expiring";

export function filterInventoryItems(
  items: InventoryItem[],
  options: {
    query: string;
    filter: InventoryFilter;
    roommateId: string;
  }
): InventoryItem[] {
  const query = options.query.trim().toLowerCase();

  return items.filter((item) => {
    if (query && !item.name.toLowerCase().includes(query)) return false;

    switch (options.filter) {
      case "shared":
        return item.ownership_type === "shared";
      case "mine":
        return item.owner_id === options.roommateId;
      case "fridge":
      case "freezer":
      case "pantry":
        return item.storage_location === options.filter;
      case "low":
        return isLowStock(item.quantity, item.minimum_quantity);
      case "expiring":
        return isExpiring(getExpiryStatus(item.expiry_date));
      default:
        return true;
    }
  });
}
