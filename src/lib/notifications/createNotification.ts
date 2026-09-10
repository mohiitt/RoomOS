import { isExpiring, getExpiryStatus } from "../inventory/checkExpiry.ts";
import { isLowStock } from "../inventory/checkLowStock.ts";
import { todayISO } from "../dates.ts";
import type {
  ApartmentNotification,
  NotificationEntityType,
} from "./types.ts";

export function excludeActor(
  roommateIds: readonly string[],
  actorId: string | null | undefined
): string[] {
  if (!actorId) return [...roommateIds];
  return roommateIds.filter((id) => id !== actorId);
}

export function shouldNotifyLowStock(input: {
  quantityBefore: number;
  quantityAfter: number;
  minimumQuantity: number | null | undefined;
}): boolean {
  if (!isLowStock(input.quantityAfter, input.minimumQuantity)) return false;
  return !isLowStock(input.quantityBefore, input.minimumQuantity);
}

export function shouldNotifyExpiring(
  expiryDate: string | null | undefined,
  today = todayISO()
): boolean {
  return isExpiring(getExpiryStatus(expiryDate ?? null, today));
}

export function lowStockRecipients(input: {
  ownershipType: "shared" | "personal" | string;
  ownerId: string | null | undefined;
  roommateIds: readonly string[];
}): string[] {
  if (input.ownershipType === "personal" && input.ownerId) {
    return [input.ownerId];
  }
  return [...input.roommateIds];
}

export function hrefForNotification(
  notification: Pick<ApartmentNotification, "entity_type" | "entity_id">
): string {
  const entityType = notification.entity_type as NotificationEntityType | null;
  const id = notification.entity_id;

  switch (entityType) {
    case "expense":
      return id ? `/money/expense/${id}` : "/money";
    case "settlement":
      return "/money/settle";
    case "inventory_item":
      return id ? `/inventory/${id}` : "/inventory";
    case "shopping_item":
      return "/shopping";
    case "chore_assignment":
      return "/chores";
    case "concern":
      return id ? `/issues/${id}` : "/issues";
    default:
      return "/notifications";
  }
}

export function unreadLabel(count: number): string {
  if (count <= 0) return "";
  if (count > 9) return "9+";
  return String(count);
}

export const PUSH_TYPES = [
  "expense_added",
  "inventory_expiring",
  "chore_due",
  "chore_assigned",
  "concern_created",
  "concern_assigned",
] as const;

export function shouldSendPush(
  type: string,
  concernPriority?: string | null
): boolean {
  if (type === "concern_created") {
    return concernPriority === "high" || concernPriority === "urgent";
  }
  return (PUSH_TYPES as readonly string[]).includes(type);
}
