import type { ExpiryStatus } from "@/types/database";
import { addDaysISO, todayISO } from "@/lib/dates";

export function getExpiryStatus(
  expiryDate: string | null,
  today = todayISO()
): ExpiryStatus {
  if (!expiryDate) return "none";
  if (expiryDate < today) return "expired";
  if (expiryDate <= addDaysISO(today, 1)) return "critical";
  if (expiryDate <= addDaysISO(today, 3)) return "soon";
  return "normal";
}

export function isExpiring(status: ExpiryStatus): boolean {
  return status === "expired" || status === "critical" || status === "soon";
}
