export const ROOMOS_CHANNEL = "roomos:apartment";
export const ROOMOS_EVENT = "roomos_changed";

export const INVENTORY_TABLES = ["inventory_items", "inventory_transactions"] as const;
export const SHOPPING_TABLES = ["shopping_items"] as const;
export const MONEY_TABLES = [
  "expenses",
  "expense_splits",
  "settlements",
  "recurring_expenses",
] as const;
export const CHORE_TABLES = ["chore_templates", "chore_assignments"] as const;
export const CONCERN_TABLES = [
  "concerns",
  "concern_comments",
  "concern_attachments",
] as const;

export type RoomosChange = {
  table: string;
  op: string;
  id?: string;
};

export function changeMatchesTables(
  change: Pick<RoomosChange, "table">,
  tables: readonly string[] | "all"
): boolean {
  if (tables === "all") return true;
  return tables.includes(change.table);
}
