import "server-only";
import { isLowStock } from "@/lib/inventory/checkLowStock";
import type { InventoryItem } from "@/types/database";
import {
  createShoppingItem,
  findNeededByInventoryId,
  findRemovedByInventoryId,
  reactivateShoppingItem,
} from "@/lib/server/shopping";

export type ShoppingSyncResult = "created" | "reactivated" | "exists" | "skipped";

function suggestedQuantity(item: InventoryItem): number | null {
  if (item.minimum_quantity === null) return null;
  const needed = item.minimum_quantity - item.quantity;
  return needed > 0 ? needed : item.minimum_quantity;
}

export async function syncLowStock(
  item: InventoryItem,
  roommateId: string
): Promise<ShoppingSyncResult> {
  if (!item.auto_add_to_shopping) return "skipped";
  if (!isLowStock(item.quantity, item.minimum_quantity)) return "skipped";

  const existing = await findNeededByInventoryId(item.id);
  if (existing) return "exists";

  const payload = {
    requested_quantity: suggestedQuantity(item),
    unit: item.unit,
    reason: "low_stock" as const,
    added_by: roommateId,
  };

  const removed = await findRemovedByInventoryId(item.id);
  if (removed) {
    await reactivateShoppingItem(removed.id, payload);
    return "reactivated";
  }

  await createShoppingItem({
    name: item.name,
    inventory_item_id: item.id,
    ...payload,
  });
  return "created";
}
