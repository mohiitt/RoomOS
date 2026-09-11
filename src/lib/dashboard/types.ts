import type { ApartmentVibe } from "@/lib/dashboard/vibe.ts";
import type { ActivityEvent, AttentionItem } from "@/lib/dashboard/summarize.ts";
import type {
  ChoreAssignment,
  ChoreTemplate,
  Concern,
  InventoryItem,
} from "@/types/database";

export type DashboardData = {
  vibe: ApartmentVibe;
  moneyStat: string;
  moneyNet: number;
  foodStat: string;
  shoppingStat: string;
  choreStat: string;
  issueStat: string;
  shoppingCount: number;
  openConcernCount: number;
  expiringItems: InventoryItem[];
  lowStockItems: InventoryItem[];
  yourChores: { assignment: ChoreAssignment; template?: ChoreTemplate }[];
  yourIssues: Concern[];
  attention: AttentionItem[];
  recentActivity: ActivityEvent[];
  roommateOfWeek: { id: string; name: string; points: number } | null;
  streak: { weeks: number; label: string; shrugging: boolean };
  errors: Partial<Record<"inventory" | "shopping" | "money" | "chores" | "issues" | "activity", string>>;
};
