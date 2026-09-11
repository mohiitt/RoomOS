import { apiJson } from "@/lib/api/browser";
import type {
  InventoryItem,
  InventoryTransaction,
  StorageLocation,
} from "@/types/database";

export async function listInventoryItems(): Promise<InventoryItem[]> {
  return apiJson<InventoryItem[]>("/api/inventory");
}

export async function getInventoryItem(id: string): Promise<InventoryItem> {
  return apiJson<InventoryItem>(`/api/inventory/${id}`);
}

export async function listItemTransactions(itemId: string): Promise<InventoryTransaction[]> {
  return apiJson<InventoryTransaction[]>(`/api/inventory/${itemId}/transactions`);
}

export async function listRecentInventoryTransactions(): Promise<InventoryTransaction[]> {
  return apiJson<InventoryTransaction[]>("/api/inventory/activity");
}

export async function createInventoryItem(input: {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  storage_location: StorageLocation;
  ownership_type: "shared" | "personal";
  owner_id: string | null;
  expiry_date: string | null;
  minimum_quantity: number | null;
  auto_add_to_shopping: boolean;
  notes: string | null;
  created_by: string;
}): Promise<InventoryItem> {
  return apiJson<InventoryItem>("/api/inventory", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateInventoryItem(
  id: string,
  input: {
    name: string;
    unit: string;
    category: string;
    storage_location: StorageLocation;
    ownership_type: "shared" | "personal";
    owner_id: string | null;
    expiry_date: string | null;
    minimum_quantity: number | null;
    auto_add_to_shopping: boolean;
    notes: string | null;
  }
): Promise<InventoryItem> {
  return apiJson<InventoryItem>(`/api/inventory/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await apiJson(`/api/inventory/${id}`, { method: "DELETE" });
}
