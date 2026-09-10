"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { useRealtimeNotifications } from "@/hooks/useRealtime.ts";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/queries.ts";
import type { ApartmentNotification } from "@/lib/notifications/types.ts";

export default function NotificationsPage() {
  const { roommate } = useRoommate();
  const [items, setItems] = useState<ApartmentNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!roommate) return;
    void listNotifications(roommate.id)
      .then(setItems)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load notifications");
        setItems([]);
      });
  }, [roommate]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtimeNotifications(load);

  const unread = (items ?? []).filter((item) => !item.is_read).length;

  async function onOpen(notification: ApartmentNotification) {
    if (notification.is_read) return;
    setItems((current) =>
      (current ?? []).map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      )
    );
    try {
      await markNotificationRead(notification.id);
    } catch (markError) {
      toast.error(markError instanceof Error ? markError.message : "Could not mark as read");
      load();
    }
  }

  async function onMarkAll() {
    if (!roommate || unread === 0) return;
    setBusy(true);
    try {
      await markAllNotificationsRead(roommate.id);
      setItems((current) => (current ?? []).map((item) => ({ ...item, is_read: true })));
    } catch (markError) {
      toast.error(markError instanceof Error ? markError.message : "Could not mark all as read");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="What changed while you were out."
        action={
          unread > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="min-h-11"
              disabled={busy}
              onClick={() => void onMarkAll()}
            >
              Mark all read
            </Button>
          ) : null
        }
      />
      {items === null ? (
        <LoadingSkeleton />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="You're all caught up."
          description="Alerts for expenses, food, chores, and issues land here."
        />
      ) : (
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <NotificationItem notification={item} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
