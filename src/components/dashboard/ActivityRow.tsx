import Link from "next/link";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatShortDate } from "@/lib/dates";
import type { ActivityEvent } from "@/lib/dashboard/summarize.ts";
import type { Roommate } from "@/types/database";

export function ActivityRow({
  event,
  roommates,
}: {
  event: ActivityEvent;
  roommates: Roommate[];
}) {
  const person = roommates.find((roommate) => roommate.id === event.roommateId);
  return (
    <Link
      href={event.href}
      className="flex items-start gap-3 rounded-2xl bg-card px-4 py-3 shadow-sm ring-1 ring-border/80"
    >
      <UserAvatar name={person?.name ?? "Roommate"} size="sm" />
      <div className="min-w-0">
        <p className="text-sm leading-5">{event.summary}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatShortDate(event.createdAt.slice(0, 10))}
        </p>
      </div>
    </Link>
  );
}
