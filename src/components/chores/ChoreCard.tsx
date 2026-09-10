import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/dates";
import { statusTone } from "@/lib/chores/queries.ts";
import type { ChoreAssignment, ChoreTemplate, Roommate } from "@/types/database";

export function ChoreCard({
  assignment,
  template,
  assignee,
  highlight,
  busy,
  onComplete,
}: {
  assignment: ChoreAssignment;
  template?: ChoreTemplate;
  assignee?: Roommate;
  highlight?: boolean;
  busy?: boolean;
  onComplete?: (assignment: ChoreAssignment) => void;
}) {
  return (
    <article className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold leading-tight">
            {template?.name ?? "Chore"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Due {formatShortDate(assignment.due_date)}
            {highlight ? " · yours" : ""}
          </p>
        </div>
        <StatusBadge tone={statusTone(assignment.status)}>
          {assignment.status}
        </StatusBadge>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <UserAvatar name={assignee?.name ?? "Roommate"} size="sm" />
        <p className="text-sm">{assignee?.name ?? "Roommate"}</p>
      </div>

      {assignment.status === "pending" && onComplete ? (
        <Button
          type="button"
          size="lg"
          className="mt-4 min-h-11 w-full"
          disabled={busy}
          onClick={() => onComplete(assignment)}
        >
          {busy ? "Saving…" : "Mark done"}
        </Button>
      ) : assignment.points_awarded != null ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {assignment.points_awarded} points
        </p>
      ) : null}
    </article>
  );
}
