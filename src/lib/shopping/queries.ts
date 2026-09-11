import { apiJson } from "@/lib/api/browser";
import type { ShoppingItem, ShoppingReason, ShoppingStatus } from "@/types/database";

export async function listShoppingItems(status: ShoppingStatus): Promise<ShoppingItem[]> {
  return apiJson<ShoppingItem[]>(`/api/shopping?status=${encodeURIComponent(status)}`);
}

export async function countNeededShoppingItems(): Promise<number> {
  const payload = await apiJson<{ count: number }>("/api/shopping/count");
  return payload.count;
}

export async function createShoppingItem(input: {
  name: string;
  requested_quantity: number | null;
  unit: string | null;
  reason: ShoppingReason;
  added_by: string;
  inventory_item_id?: string | null;
}): Promise<ShoppingItem> {
  return apiJson<ShoppingItem>("/api/shopping", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function findNeededByInventoryId(inventoryItemId: string): Promise<ShoppingItem | null> {
  return apiJson<ShoppingItem | null>(
    `/api/shopping/by-inventory?inventoryItemId=${encodeURIComponent(inventoryItemId)}&status=needed`
  );
}

export async function findRemovedByInventoryId(
  inventoryItemId: string
): Promise<ShoppingItem | null> {
  return apiJson<ShoppingItem | null>(
    `/api/shopping/by-inventory?inventoryItemId=${encodeURIComponent(inventoryItemId)}&status=removed`
  );
}

export async function reactivateShoppingItem(
  id: string,
  updates: {
    requested_quantity: number | null;
    unit: string | null;
    reason: ShoppingReason;
    added_by: string;
  }
): Promise<ShoppingItem> {
  return apiJson<ShoppingItem>(`/api/shopping/${id}/reactivate`, {
    method: "POST",
    body: JSON.stringify(updates),
  });
}

export async function removeShoppingItem(id: string): Promise<void> {
  await apiJson(`/api/shopping/${id}/remove`, { method: "POST" });
}

export async function purchaseShoppingItem(input: {
  shoppingId: string;
  roommateId: string;
  quantity: number;
}): Promise<ShoppingItem> {
  return apiJson<ShoppingItem>(`/api/shopping/${input.shoppingId}/purchase`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
