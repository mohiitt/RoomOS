import { apiJson } from "@/lib/api/browser";
import type { ActivityEvent, AttentionItem } from "@/lib/dashboard/summarize.ts";
import type {
  ChoreAssignment,
  ChoreTemplate,
  Concern,
  InventoryItem,
  Roommate,
} from "@/types/database";

export type DashboardData = {
  moneyLabel: string;
  moneyNet: number;
  latestExpenseLabel: string;
  foodLabel: string;
  shoppingLabel: string;
  choreLabel: string;
  issueLabel: string;
  shoppingCount: number;
  openConcernCount: number;
  expiringItems: InventoryItem[];
  lowStockItems: InventoryItem[];
  yourChores: { assignment: ChoreAssignment; template?: ChoreTemplate }[];
  yourIssues: Concern[];
  attention: AttentionItem[];
  recentActivity: ActivityEvent[];
  errors: Partial<Record<"inventory" | "shopping" | "money" | "chores" | "issues" | "activity", string>>;
};

export async function getDashboardData(
  _unused?: { viewerId: string; roommates: Roommate[] }
): Promise<DashboardData> {
  void _unused;
  return apiJson<DashboardData>("/api/dashboard");
}
