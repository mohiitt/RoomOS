export const NOTIFICATION_TYPES = [
  "expense_added",
  "settlement_added",
  "inventory_low",
  "inventory_expiring",
  "chore_due",
  "chore_assigned",
  "concern_created",
  "concern_assigned",
  "concern_resolved",
  "shopping_added",
  "money_nudge",
  "chore_swap",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationEntityType =
  | "expense"
  | "settlement"
  | "inventory_item"
  | "shopping_item"
  | "chore_assignment"
  | "concern";

export type ApartmentNotification = {
  id: string;
  roommate_id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type: NotificationEntityType | string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};
