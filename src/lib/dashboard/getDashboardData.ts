import { apiJson } from "@/lib/api/browser";
import type { DashboardData } from "@/lib/dashboard/types.ts";
import type { Roommate } from "@/types/database";

export type { DashboardData };

export async function getDashboardData(
  _unused?: { viewerId: string; roommates: Roommate[] }
): Promise<DashboardData> {
  void _unused;
  return apiJson<DashboardData>("/api/dashboard");
}
