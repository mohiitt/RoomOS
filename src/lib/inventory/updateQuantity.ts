import { describeError, getInsforge } from "@/lib/insforge/client";
import { toNumber, toNumberOrNull } from "@/lib/dates";
import type { InventoryItem, StorageLocation, TransactionType } from "@/types/database";

type RawItem = Record<string, unknown>;

function mapItem(row: RawItem): InventoryItem {
  return {
    id: String(row.id),
    name: String(row.name),
    quantity: toNumber(row.quantity),
    unit: String(row.unit),
    category: (row.category as InventoryItem["category"]) ?? null,
    storage_location: row.storage_location as StorageLocation,
    ownership_type: row.ownership_type === "personal" ? "personal" : "shared",
    owner_id: (row.owner_id as string | null) ?? null,
    expiry_date: (row.expiry_date as string | null) ?? null,
    minimum_quantity: toNumberOrNull(row.minimum_quantity),
    auto_add_to_shopping: Boolean(row.auto_add_to_shopping),
    notes: (row.notes as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function adjustInventoryQuantity(input: {
  itemId: string;
  roommateId: string;
  transactionType: Extract<TransactionType, "consume" | "add" | "adjust" | "discard">;
  quantityChange: number;
  note?: string;
}): Promise<InventoryItem> {
  if (input.quantityChange === 0) {
    throw new Error("Quantity change cannot be zero");
  }

  const { data, error } = await getInsforge().database.rpc("adjust_inventory", {
    p_item_id: input.itemId,
    p_roommate_id: input.roommateId,
    p_transaction_type: input.transactionType,
    p_quantity_change: input.quantityChange,
    p_note: input.note ?? null,
  });

  if (error) {
    throw new Error(describeError(error, "Could not update quantity"));
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Could not update quantity");
  return mapItem(row as RawItem);
}

export async function consumeInventory(
  item: InventoryItem,
  amount: number,
  roommateId: string
): Promise<InventoryItem> {
  if (amount <= 0) throw new Error("Enter how much you used");
  if (amount > item.quantity) throw new Error("That is more than we have");
  const updated = await adjustInventoryQuantity({
    itemId: item.id,
    roommateId,
    transactionType: "consume",
    quantityChange: -amount,
  });
  await syncShoppingQuietly(updated, roommateId);
  return updated;
}

export async function addInventoryStock(
  item: InventoryItem,
  amount: number,
  roommateId: string
): Promise<InventoryItem> {
  if (amount <= 0) throw new Error("Enter how much you added");
  const updated = await adjustInventoryQuantity({
    itemId: item.id,
    roommateId,
    transactionType: "add",
    quantityChange: amount,
  });
  await syncShoppingQuietly(updated, roommateId);
  return updated;
}

async function syncShoppingQuietly(item: InventoryItem, roommateId: string) {
  try {
    const { syncLowStock } = await import("@/lib/shopping/syncLowStock");
    await syncLowStock(item, roommateId);
  } catch (error) {
    console.error("Shopping sync failed", error);
  }
}
