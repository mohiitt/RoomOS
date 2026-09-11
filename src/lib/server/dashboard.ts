import "server-only";
import { getExpiryStatus, isExpiring } from "@/lib/inventory/checkExpiry";
import { isLowStock } from "@/lib/inventory/checkLowStock";
import { listInventoryItems, listRecentInventoryTransactions } from "@/lib/server/inventory";
import { listShoppingItems } from "@/lib/server/shopping";
import { listApartmentBalances, listExpenses, listSettlements } from "@/lib/server/expenses";
import { moneyViewFromNets } from "@/lib/expenses/view.ts";
import { formatMoney } from "@/lib/expenses/money.ts";
import {
  generateDueChoreAssignments,
  listChoreAssignments,
  listChoreTemplates,
} from "@/lib/server/chores";
import { weekDueDate } from "@/lib/chores/week.ts";
import { listConcerns } from "@/lib/server/issues";
import { isOpenStatus } from "@/lib/issues/constants.ts";
import { copy } from "@/lib/copy.ts";
import {
  choreHeadline,
  eventsFromChores,
  eventsFromConcerns,
  eventsFromExpenses,
  eventsFromInventory,
  eventsFromSettlements,
  eventsFromShopping,
  foodHeadline,
  issueHeadline,
  latestExpenseHeadline,
  mergeActivity,
  moneyHeadline,
  shoppingHeadline,
  type ActivityEvent,
  type AttentionItem,
} from "@/lib/dashboard/summarize.ts";
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

function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

export async function getDashboardData(input: {
  viewerId: string;
  roommates: Roommate[];
}): Promise<DashboardData> {
  const names = Object.fromEntries(input.roommates.map((person) => [person.id, person.name]));
  await generateDueChoreAssignments().catch(() => 0);

  const [
    itemsResult,
    neededResult,
    purchasedResult,
    expensesResult,
    balancesResult,
    settlementsResult,
    templatesResult,
    assignmentsResult,
    concernsResult,
    transactionsResult,
  ] = await Promise.allSettled([
    listInventoryItems(),
    listShoppingItems("needed"),
    listShoppingItems("purchased"),
    listExpenses({ limit: 40 }),
    listApartmentBalances(),
    listSettlements({ limit: 20 }),
    listChoreTemplates(),
    listChoreAssignments(),
    listConcerns(),
    listRecentInventoryTransactions(),
  ]);

  const items = settled(itemsResult, []);
  const needed = settled(neededResult, []);
  const purchased = settled(purchasedResult, []);
  const expenses = settled(expensesResult, []);
  const balances = settled(balancesResult, []);
  const settlements = settled(settlementsResult, []);
  const templates = settled(templatesResult, []);
  const assignments = settled(assignmentsResult, []);
  const concerns = settled(concernsResult, []);
  const transactions = settled(transactionsResult, []);

  const money = moneyViewFromNets(
    input.roommates.map((person) => ({
      roommateId: person.id,
      net: balances.find((row) => row.roommateId === person.id)?.net ?? 0,
    })),
    input.viewerId
  );

  const expiringItems = items.filter((item) => isExpiring(getExpiryStatus(item.expiry_date)));
  const lowStockItems = items.filter((item) =>
    isLowStock(item.quantity, item.minimum_quantity)
  );
  const due = weekDueDate();
  const thisWeek = assignments.filter((assignment) => assignment.due_date === due);
  const yourChores = assignments
    .filter(
      (assignment) =>
        assignment.assigned_to === input.viewerId && assignment.status === "pending"
    )
    .map((assignment) => ({
      assignment,
      template: templates.find((template) => template.id === assignment.chore_template_id),
    }));
  const pendingThisWeek = thisWeek.filter((assignment) => assignment.status === "pending").length;
  const openConcerns = concerns.filter((concern) => isOpenStatus(concern.status));
  const yourIssues = openConcerns.filter(
    (concern) => concern.assigned_to === input.viewerId
  );

  const attention: AttentionItem[] = [];
  if (money.totals.net < 0) {
    attention.push({
      id: "money",
      href: "/money",
      title: moneyHeadline(money.totals.net, formatMoney),
      detail: "Open money to settle up.",
    });
  } else if (money.totals.net > 0) {
    attention.push({
      id: "money-owed",
      href: "/money",
      title: moneyHeadline(money.totals.net, formatMoney),
      detail: "Someone still needs to pay you.",
    });
  }
  for (const chore of yourChores) {
    attention.push({
      id: `chore-${chore.assignment.id}`,
      href: "/chores",
      title: chore.template?.name ?? "Chore",
      detail: `Due this week`,
    });
  }
  if (expiringItems.length > 0) {
    attention.push({
      id: "food",
      href: "/inventory?filter=expiring",
      title:
        expiringItems.length === 1
          ? `${expiringItems[0].name} needs attention`
          : `${expiringItems.length} foods expiring`,
      detail: "Check the fridge and pantry.",
    });
  }
  for (const issue of yourIssues) {
    attention.push({
      id: `issue-${issue.id}`,
      href: `/issues/${issue.id}`,
      title: issue.title,
      detail: "Assigned to you",
    });
  }

  const itemNames = Object.fromEntries(items.map((item) => [item.id, item.name]));
  const choreNames = Object.fromEntries(templates.map((template) => [template.id, template.name]));
  const recentActivity = mergeActivity(
    [
      ...eventsFromExpenses(expenses, names),
      ...eventsFromSettlements(settlements, names),
      ...eventsFromInventory(transactions, itemNames, names),
      ...eventsFromShopping([...needed, ...purchased], names),
      ...eventsFromChores(assignments, choreNames, names),
      ...eventsFromConcerns(concerns, names),
    ],
    50
  );

  const latestExpense = expenses[0] ?? null;

  const errors: DashboardData["errors"] = {};
  if (itemsResult.status === "rejected") errors.inventory = "Could not load food.";
  if (neededResult.status === "rejected" || purchasedResult.status === "rejected") {
    errors.shopping = "Could not load shopping.";
  }
  if (expensesResult.status === "rejected" || balancesResult.status === "rejected") {
    errors.money = "Could not load balances.";
  }
  if (templatesResult.status === "rejected" || assignmentsResult.status === "rejected") {
    errors.chores = "Could not load chores.";
  }
  if (concernsResult.status === "rejected") errors.issues = "Could not load issues.";
  if (transactionsResult.status === "rejected") errors.activity = "Could not load activity.";

  return {
    moneyLabel: errors.money ? "Balance unavailable" : moneyHeadline(money.totals.net, formatMoney),
    moneyNet: errors.money ? 0 : money.totals.net,
    latestExpenseLabel: errors.money ? "Money is unavailable right now" : latestExpenseHeadline(latestExpense, names, copy.latestExpenseEmpty),
    foodLabel: errors.inventory ? "Food unavailable" : foodHeadline(expiringItems.length, lowStockItems.length),
    shoppingLabel: errors.shopping ? "Shopping unavailable" : shoppingHeadline(needed.length),
    choreLabel: errors.chores ? "Chores unavailable" : choreHeadline(yourChores.length, pendingThisWeek, templates.length > 0),
    issueLabel: errors.issues ? "Issues unavailable" : issueHeadline(openConcerns.length),
    shoppingCount: needed.length,
    openConcernCount: openConcerns.length,
    expiringItems: expiringItems.slice(0, 3),
    lowStockItems: lowStockItems.slice(0, 3),
    yourChores,
    yourIssues,
    attention,
    recentActivity,
    errors,
  };
}
