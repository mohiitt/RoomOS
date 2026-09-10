import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatShortDate } from "@/lib/dates";
import {
  labelForPriority,
  labelForStatus,
  priorityTone,
  statusTone,
} from "@/lib/issues/constants.ts";
import type { Concern, Roommate } from "@/types/database";

export function IssueCard({
  concern,
  reporter,
  assignee,
}: {
  concern: Concern;
  reporter?: Roommate;
  assignee?: Roommate;
}) {
  return (
    <Link
      href={`/issues/${concern.id}`}
      className="block rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border transition active:translate-y-px"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold leading-tight">{concern.title}</h2>
        <StatusBadge tone={priorityTone(concern.priority)}>
          {labelForPriority(concern.priority)}
        </StatusBadge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge tone={statusTone(concern.status)}>
          {labelForStatus(concern.status)}
        </StatusBadge>
        <p className="text-sm text-muted-foreground">
          {formatShortDate(concern.created_at.slice(0, 10))}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <UserAvatar name={assignee?.name ?? reporter?.name ?? "Roommate"} size="sm" />
        <p className="text-sm text-muted-foreground">
          {assignee
            ? `Assigned to ${assignee.name}`
            : reporter
              ? `Reported by ${reporter.name}`
              : "Unassigned"}
        </p>
      </div>
    </Link>
  );
}
