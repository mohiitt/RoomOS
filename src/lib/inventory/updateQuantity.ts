import { apiJson } from "@/lib/api/browser";
import type { InventoryItem, TransactionType } from "@/types/database";

export async function adjustInventoryQuantity(input: {
  itemId: string;
  roommateId: string;
  transactionType: Extract<TransactionType, "consume" | "add" | "adjust" | "discard">;
  quantityChange: number;
  note?: string;
}): Promise<InventoryItem> {
  return apiJson<InventoryItem>(`/api/inventory/${input.itemId}/adjust`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function consumeInventory(
  item: InventoryItem,
  amount: number,
  roommateId: string
): Promise<InventoryItem> {
  return apiJson<InventoryItem>(`/api/inventory/${item.id}/consume`, {
    method: "POST",
    body: JSON.stringify({ amount, roommateId }),
  });
}

export async function addInventoryStock(
  item: InventoryItem,
  amount: number,
  roommateId: string
): Promise<InventoryItem> {
  return apiJson<InventoryItem>(`/api/inventory/${item.id}/add`, {
    method: "POST",
    body: JSON.stringify({ amount, roommateId }),
  });
}
