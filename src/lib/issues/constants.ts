export type ConcernPriority = "low" | "medium" | "high" | "urgent";
export type ConcernStatus = "open" | "assigned" | "in_progress" | "resolved";

export const CONCERN_PRIORITIES: { value: ConcernPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const CONCERN_STATUSES: { value: ConcernStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

export const CONCERN_PHOTOS_BUCKET = "concern-photos";

export function labelForPriority(value: ConcernPriority): string {
  return CONCERN_PRIORITIES.find((item) => item.value === value)?.label ?? value;
}

export function labelForStatus(value: ConcernStatus): string {
  return CONCERN_STATUSES.find((item) => item.value === value)?.label ?? value;
}

export function priorityTone(
  value: ConcernPriority
): "neutral" | "info" | "warn" | "bad" {
  if (value === "urgent") return "bad";
  if (value === "high") return "warn";
  if (value === "medium") return "info";
  return "neutral";
}

export function statusTone(
  value: ConcernStatus
): "neutral" | "good" | "warn" | "info" {
  if (value === "resolved") return "good";
  if (value === "in_progress") return "info";
  if (value === "assigned") return "warn";
  return "neutral";
}

export function statusOnAssign(
  current: ConcernStatus,
  assignedTo: string | null
): ConcernStatus {
  if (current === "resolved" || current === "in_progress") return current;
  if (assignedTo) return current === "open" ? "assigned" : current;
  return current === "assigned" ? "open" : current;
}

export function isOpenStatus(status: ConcernStatus): boolean {
  return status !== "resolved";
}

export function concernStatusAllowed(from: ConcernStatus, to: ConcernStatus): boolean {
  if (from === to) return true;
  if (from === "open") return to === "assigned" || to === "in_progress" || to === "resolved";
  if (from === "assigned") return to === "open" || to === "in_progress" || to === "resolved";
  if (from === "in_progress") return to === "assigned" || to === "resolved";
  if (from === "resolved") return to === "open" || to === "assigned";
  return false;
}
