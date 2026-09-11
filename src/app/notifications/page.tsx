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
  listNotificationPage,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/queries.ts";
import type { ApartmentNotification } from "@/lib/notifications/types.ts";

export default function NotificationsPage() {
  const { roommate } = useRoommate();
  const [items, setItems] = useState<ApartmentNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(() => {
    if (!roommate) return;
    void listNotificationPage(0, 40)
      .then((page) => {
        setItems(page.items);
        setHasMore(page.hasMore);
      })
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
        backHref="/"
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
      {items && items.length > 0 && hasMore ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-4 min-h-11 w-full"
          disabled={loadingMore}
          onClick={() => {
            if (!items) return;
            setLoadingMore(true);
            void listNotificationPage(items.length, 40)
              .then((page) => {
                setItems((current) => [...(current ?? []), ...page.items]);
                setHasMore(page.hasMore);
              })
              .catch((loadError: unknown) => {
                toast.error(
                  loadError instanceof Error ? loadError.message : "Could not load more"
                );
              })
              .finally(() => setLoadingMore(false));
          }}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
