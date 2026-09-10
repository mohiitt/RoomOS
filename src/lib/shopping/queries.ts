import { describeError, getInsforge } from "@/lib/insforge/client";
import { toNumberOrNull } from "@/lib/dates";
import type { ShoppingItem, ShoppingReason, ShoppingStatus } from "@/types/database";

type RawItem = Record<string, unknown>;

const COLUMNS =
  "id, name, inventory_item_id, requested_quantity, unit, reason, status, added_by, purchased_by, created_at, purchased_at";

function mapItem(row: RawItem): ShoppingItem {
  return {
    id: String(row.id),
    name: String(row.name),
    inventory_item_id: (row.inventory_item_id as string | null) ?? null,
    requested_quantity: toNumberOrNull(row.requested_quantity),
    unit: (row.unit as string | null) ?? null,
    reason: row.reason as ShoppingReason,
    status: row.status as ShoppingStatus,
    added_by: (row.added_by as string | null) ?? null,
    purchased_by: (row.purchased_by as string | null) ?? null,
    created_at: String(row.created_at),
    purchased_at: (row.purchased_at as string | null) ?? null,
  };
}

export async function listShoppingItems(
  status: ShoppingStatus
): Promise<ShoppingItem[]> {
  const query = getInsforge()
    .database.from("shopping_items")
    .select(COLUMNS)
    .eq("status", status)
    .limit(200);

  const ordered =
    status === "purchased"
      ? query.order("purchased_at", { ascending: false })
      : query.order("created_at", { ascending: true });

  const { data, error } = await ordered;
  if (error) throw new Error(describeError(error, "Could not load shopping list"));
  return ((data ?? []) as RawItem[]).map(mapItem);
}

export async function countNeededShoppingItems(): Promise<number> {
  const { data, error } = await getInsforge()
    .database.from("shopping_items")
    .select("id")
    .eq("status", "needed")
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load shopping count"));
  return (data ?? []).length;
}

export async function createShoppingItem(input: {
  name: string;
  requested_quantity: number | null;
  unit: string | null;
  reason: ShoppingReason;
  added_by: string;
  inventory_item_id?: string | null;
}): Promise<ShoppingItem> {
  const { data, error } = await getInsforge()
    .database.from("shopping_items")
    .insert([
      {
        name: input.name,
        requested_quantity: input.requested_quantity,
        unit: input.unit,
        reason: input.reason,
        status: "needed",
        added_by: input.added_by,
        inventory_item_id: input.inventory_item_id ?? null,
      },
    ])
    .select(COLUMNS);

  if (error || !data?.[0]) {
    const message = describeError(error, "Could not add shopping item");
    if (/duplicate|unique/i.test(message)) {
      throw new Error("That item is already on the list");
    }
    throw new Error(message);
  }

  return mapItem(data[0] as RawItem);
}

export async function findNeededByInventoryId(
  inventoryItemId: string
): Promise<ShoppingItem | null> {
  const { data, error } = await getInsforge()
    .database.from("shopping_items")
    .select(COLUMNS)
    .eq("inventory_item_id", inventoryItemId)
    .eq("status", "needed")
    .maybeSingle();

  if (error) throw new Error(describeError(error, "Could not check shopping list"));
  return data ? mapItem(data as RawItem) : null;
}

export async function findRemovedByInventoryId(
  inventoryItemId: string
): Promise<ShoppingItem | null> {
  const { data, error } = await getInsforge()
    .database.from("shopping_items")
    .select(COLUMNS)
    .eq("inventory_item_id", inventoryItemId)
    .eq("status", "removed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(describeError(error, "Could not check shopping list"));
  return data ? mapItem(data as RawItem) : null;
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
  const { data, error } = await getInsforge()
    .database.from("shopping_items")
    .update({
      status: "needed",
      purchased_by: null,
      purchased_at: null,
      requested_quantity: updates.requested_quantity,
      unit: updates.unit,
      reason: updates.reason,
      added_by: updates.added_by,
    })
    .eq("id", id)
    .select(COLUMNS);

  if (error || !data?.[0]) {
    throw new Error(describeError(error, "Could not restore shopping item"));
  }

  return mapItem(data[0] as RawItem);
}

export async function removeShoppingItem(id: string): Promise<void> {
  const { error } = await getInsforge()
    .database.from("shopping_items")
    .update({ status: "removed" })
    .eq("id", id)
    .eq("status", "needed");

  if (error) throw new Error(describeError(error, "Could not remove item"));
}

export async function purchaseShoppingItem(input: {
  shoppingId: string;
  roommateId: string;
  quantity: number;
}): Promise<ShoppingItem> {
  const { data, error } = await getInsforge().database.rpc("purchase_shopping_item", {
    p_shopping_id: input.shoppingId,
    p_roommate_id: input.roommateId,
    p_quantity: input.quantity,
  });

  if (error) throw new Error(describeError(error, "Could not mark purchased"));
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Could not mark purchased");
  return mapItem(row as RawItem);
}
