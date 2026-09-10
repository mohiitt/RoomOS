"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { unreadLabel } from "@/lib/notifications/createNotification.ts";
import { useUnreadCount } from "@/hooks/useUnreadCount.ts";

export function NotificationBell({
  className,
}: {
  className?: string;
}) {
  const count = useUnreadCount();
  const label = unreadLabel(count);

  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
      className={
        className ??
        "relative flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-foreground ring-1 ring-border"
      }
    >
      <Bell className="size-5" strokeWidth={1.8} />
      {label ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-4 text-white">
          {label}
        </span>
      ) : null}
    </Link>
  );
}

export function UnreadDot({ compact = false }: { compact?: boolean }) {
  const count = useUnreadCount();
  const label = unreadLabel(count);
  if (!label) return null;
  if (compact) {
    return (
      <span className="absolute -right-1.5 -top-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-4 text-white">
        {label}
      </span>
    );
  }
  return (
    <span className="min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-4 text-white">
      {label}
    </span>
  );
}
