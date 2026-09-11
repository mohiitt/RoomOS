import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/dates";
import { hrefForNotification } from "@/lib/notifications/createNotification.ts";
import type { ApartmentNotification } from "@/lib/notifications/types.ts";

export function NotificationItem({
  notification,
  onOpen,
}: {
  notification: ApartmentNotification;
  onOpen: (notification: ApartmentNotification) => void;
}) {
  return (
    <Link
      href={hrefForNotification(notification)}
      onClick={() => onOpen(notification)}
      className={cn(
        "block rounded-2xl px-4 py-3 ring-1 ring-border",
        notification.is_read ? "bg-card" : "bg-primary/10 ring-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{notification.title}</p>
        {notification.is_read ? (
          <span className="text-[11px] font-medium text-foreground/70">Read</span>
        ) : (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
            Unread
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{notification.message}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatShortDate(notification.created_at.slice(0, 10))}
      </p>
    </Link>
  );
}
