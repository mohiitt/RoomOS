import "server-only";
import { getAdminInsforge } from "@/lib/insforge/admin";
import { describeError } from "@/lib/insforge/errors";
import { toNumber } from "@/lib/dates";
import type { ApartmentNotification, NotificationType } from "@/lib/notifications/types.ts";

type Raw = Record<string, unknown>;

const COLUMNS =
  "id, roommate_id, type, title, message, entity_type, entity_id, is_read, created_at";

function unwrapRpc(data: unknown): unknown {
  return Array.isArray(data) ? data[0] : data;
}

function mapNotification(row: Raw): ApartmentNotification {
  return {
    id: String(row.id),
    roommate_id: String(row.roommate_id),
    type: row.type as NotificationType,
    title: String(row.title),
    message: String(row.message),
    entity_type: (row.entity_type as string | null) ?? null,
    entity_id: (row.entity_id as string | null) ?? null,
    is_read: Boolean(row.is_read),
    created_at: String(row.created_at),
  };
}

export async function listNotifications(
  roommateId: string,
  options?: { limit?: number; offset?: number }
): Promise<ApartmentNotification[]> {
  const limit = Math.min(options?.limit ?? 40, 100);
  const offset = Math.max(options?.offset ?? 0, 0);
  const { data, error } = await getAdminInsforge()
    .database.from("notifications")
    .select(COLUMNS)
    .eq("roommate_id", roommateId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(describeError(error, "Could not load notifications"));
  return ((data ?? []) as Raw[]).map(mapNotification);
}

export async function countUnreadNotifications(roommateId: string): Promise<number> {
  const { data, error } = await getAdminInsforge()
    .database.from("notifications")
    .select("id")
    .eq("roommate_id", roommateId)
    .eq("is_read", false)
    .limit(99);

  if (error) throw new Error(describeError(error, "Could not load unread count"));
  return (data ?? []).length;
}

export async function markNotificationRead(id: string, roommateId?: string): Promise<void> {
  let query = getAdminInsforge()
    .database.from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (roommateId) query = query.eq("roommate_id", roommateId);
  const { error } = await query;

  if (error) throw new Error(describeError(error, "Could not mark as read"));
}

export async function markAllNotificationsRead(roommateId: string): Promise<void> {
  const { error } = await getAdminInsforge()
    .database.from("notifications")
    .update({ is_read: true })
    .eq("roommate_id", roommateId)
    .eq("is_read", false);

  if (error) throw new Error(describeError(error, "Could not mark all as read"));
}

export async function generateTimeNotifications(): Promise<number> {
  const { data, error } = await getAdminInsforge().database.rpc("generate_time_notifications");
  if (error) throw new Error(describeError(error, "Could not refresh alerts"));
  return toNumber(unwrapRpc(data));
}
