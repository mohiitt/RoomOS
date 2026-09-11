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

export function sortInventoryForUseSoon(items: InventoryItem[]): InventoryItem[] {
  const order = ["expired", "critical", "soon", "normal", "none"] as const;
  return [...items].sort((a, b) => {
    const aStatus = getExpiryStatus(a.expiry_date);
    const bStatus = getExpiryStatus(b.expiry_date);
    const byExpiry = order.indexOf(aStatus) - order.indexOf(bStatus);
    if (byExpiry !== 0) return byExpiry;
    const aLow = isLowStock(a.quantity, a.minimum_quantity) ? 0 : 1;
    const bLow = isLowStock(b.quantity, b.minimum_quantity) ? 0 : 1;
    if (aLow !== bLow) return aLow - bLow;
    return a.name.localeCompare(b.name);
  });
}
