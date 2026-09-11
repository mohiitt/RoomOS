import { apiJson } from "@/lib/api/browser";
import type { ApartmentNotification } from "./types.ts";

export async function listNotifications(roommateId: string): Promise<ApartmentNotification[]> {
  const payload = await apiJson<{ items: ApartmentNotification[]; hasMore: boolean }>(
    `/api/notifications?roommateId=${encodeURIComponent(roommateId)}`
  );
  return payload.items;
}

export async function listNotificationPage(offset = 0, limit = 40) {
  return apiJson<{ items: ApartmentNotification[]; hasMore: boolean }>(
    `/api/notifications?limit=${limit}&offset=${offset}`
  );
}

export async function countUnreadNotifications(roommateId: string): Promise<number> {
  const payload = await apiJson<{ count: number }>(
    `/api/notifications/unread?roommateId=${encodeURIComponent(roommateId)}`
  );
  return payload.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiJson(`/api/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(roommateId: string): Promise<void> {
  await apiJson("/api/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({ roommateId }),
  });
}

export async function generateTimeNotifications(): Promise<number> {
  const payload = await apiJson<{ count: number }>("/api/notifications/generate-time", {
    method: "POST",
  });
  return payload.count;
}
