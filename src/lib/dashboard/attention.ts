import { addDaysISO, todayISO } from "../dates.ts";
import type { AttentionItem } from "./summarize.ts";

const STALE_DAYS = 7;

export function buildAttention(input: {
  viewerId: string;
  moneyNet: number;
  oldestUnsettledExpenseDate: string | null;
  overdueChores: { id: string; name: string; dueDate: string }[];
  expiringItems: { id: string; name: string }[];
  yourIssues: { id: string; title: string }[];
  today?: string;
}): AttentionItem[] {
  const today = input.today ?? todayISO();
  const staleCutoff = addDaysISO(today, -STALE_DAYS);
  const items: AttentionItem[] = [];

  if (
    input.moneyNet > 0 &&
    input.oldestUnsettledExpenseDate &&
    input.oldestUnsettledExpenseDate <= staleCutoff
  ) {
    items.push({
      id: "money-stale",
      href: "/money",
      title: "Someone still owes you",
      detail: "It's been over a week. Nudge them from Money.",
    });
  }

  for (const chore of input.overdueChores) {
    items.push({
      id: `chore-${chore.id}`,
      href: "/chores",
      title: chore.name,
      detail: "Overdue — mark it done or swap it.",
    });
  }

  if (input.expiringItems.length === 1) {
    items.push({
      id: "food",
      href: "/inventory?filter=expiring",
      title: `${input.expiringItems[0].name} needs a decision`,
      detail: "Use it or toss it.",
    });
  } else if (input.expiringItems.length > 1) {
    items.push({
      id: "food",
      href: "/inventory?filter=expiring",
      title: `${input.expiringItems.length} foods need a decision`,
      detail: "Expiring or already gone. Check the fridge.",
    });
  }

  for (const issue of input.yourIssues) {
    items.push({
      id: `issue-${issue.id}`,
      href: `/issues/${issue.id}`,
      title: issue.title,
      detail: "Assigned to you — update it.",
    });
  }

  return items;
}

export { STALE_DAYS };
