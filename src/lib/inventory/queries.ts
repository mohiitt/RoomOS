import { describeError, getInsforge } from "@/lib/insforge/client";
import { toNumber, toNumberOrNull } from "@/lib/dates";
import type {
  InventoryItem,
  InventoryTransaction,
  StorageLocation,
} from "@/types/database";

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

function mapTransaction(row: RawItem): InventoryTransaction {
  return {
    id: String(row.id),
    inventory_item_id: String(row.inventory_item_id),
    roommate_id: (row.roommate_id as string | null) ?? null,
    transaction_type: row.transaction_type as InventoryTransaction["transaction_type"],
    quantity_change: toNumber(row.quantity_change),
    quantity_before: toNumber(row.quantity_before),
    quantity_after: toNumber(row.quantity_after),
    note: (row.note as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

const ITEM_COLUMNS =
  "id, name, quantity, unit, category, storage_location, ownership_type, owner_id, expiry_date, minimum_quantity, auto_add_to_shopping, notes, created_by, created_at, updated_at";

export async function listInventoryItems(): Promise<InventoryItem[]> {
  const { data, error } = await getInsforge()
    .database.from("inventory_items")
    .select(ITEM_COLUMNS)
    .order("name", { ascending: true })
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load inventory"));
  return ((data ?? []) as RawItem[]).map(mapItem);
}

export async function getInventoryItem(id: string): Promise<InventoryItem> {
  const { data, error } = await getInsforge()
    .database.from("inventory_items")
    .select(ITEM_COLUMNS)
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error(describeError(error, "Could not load this item"));
  }

  return mapItem(data as RawItem);
}

export async function listItemTransactions(
  itemId: string
): Promise<InventoryTransaction[]> {
  const { data, error } = await getInsforge()
    .database.from("inventory_transactions")
    .select(
      "id, inventory_item_id, roommate_id, transaction_type, quantity_change, quantity_before, quantity_after, note, created_at"
    )
    .eq("inventory_item_id", itemId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(describeError(error, "Could not load history"));
  return ((data ?? []) as RawItem[]).map(mapTransaction);
}

export async function listRecentInventoryTransactions(): Promise<
  InventoryTransaction[]
> {
  const { data, error } = await getInsforge()
    .database.from("inventory_transactions")
    .select(
      "id, inventory_item_id, roommate_id, transaction_type, quantity_change, quantity_before, quantity_after, note, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) throw new Error(describeError(error, "Could not load inventory activity"));
  return ((data ?? []) as RawItem[]).map(mapTransaction);
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
  const { data, error } = await getInsforge()
    .database.from("inventory_items")
    .insert([input])
    .select(ITEM_COLUMNS);

  if (error || !data?.[0]) {
    throw new Error(describeError(error, "Could not add item"));
  }

  return mapItem(data[0] as RawItem);
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
  const { data, error } = await getInsforge()
    .database.from("inventory_items")
    .update(input)
    .eq("id", id)
    .select(ITEM_COLUMNS);

  if (error || !data?.[0]) {
    throw new Error(describeError(error, "Could not update item"));
  }

  return mapItem(data[0] as RawItem);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await getInsforge()
    .database.from("inventory_items")
    .delete()
    .eq("id", id);

  if (error) throw new Error(describeError(error, "Could not delete item"));
}
