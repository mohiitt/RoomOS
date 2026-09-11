import "server-only";
import { getExpiryStatus, isExpiring } from "@/lib/inventory/checkExpiry";
import { isLowStock } from "@/lib/inventory/checkLowStock";
import { listInventoryItems, listRecentInventoryTransactions } from "@/lib/server/inventory";
import { listShoppingItems } from "@/lib/server/shopping";
import { listApartmentBalances, listExpenses, listSettlements } from "@/lib/server/expenses";
import { moneyViewFromNets } from "@/lib/expenses/view.ts";
import {
  generateDueChoreAssignments,
  listChoreAssignments,
  listChoreTemplates,
} from "@/lib/server/chores";
import { weekDueDate } from "@/lib/chores/week.ts";
import { listConcerns } from "@/lib/server/issues";
import { isOpenStatus } from "@/lib/issues/constants.ts";
import { todayISO } from "@/lib/dates.ts";
import { buildAttention } from "@/lib/dashboard/attention.ts";
import {
  apartmentVibe,
  choreStatLabel,
  foodStatLabel,
  issueStatLabel,
  moneyStatLabel,
  roommateOfTheWeek,
  shoppingStatLabel,
  streakCopy,
} from "@/lib/dashboard/vibe.ts";
import { calculateStreak, totalPoints } from "@/lib/chores/calculateStreak.ts";
import {
  eventsFromChores,
  eventsFromConcerns,
  eventsFromExpenses,
  eventsFromInventory,
  eventsFromSettlements,
  eventsFromShopping,
  mergeActivity,
  type AttentionItem,
} from "@/lib/dashboard/summarize.ts";
import type { DashboardData } from "@/lib/dashboard/types.ts";
import type { Roommate } from "@/types/database";

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
  const today = todayISO();
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
  const overdueChores = yourChores
    .filter((chore) => chore.assignment.due_date < today)
    .map((chore) => ({
      id: chore.assignment.id,
      name: chore.template?.name ?? "Chore",
      dueDate: chore.assignment.due_date,
    }));
  const openConcerns = concerns.filter((concern) => isOpenStatus(concern.status));
  const yourIssues = openConcerns.filter(
    (concern) => concern.assigned_to === input.viewerId
  );
  const openUrgent = openConcerns.filter(
    (concern) => concern.priority === "urgent" || concern.priority === "high"
  ).length;
  const oldestUnsettledExpenseDate =
    money.totals.net > 0
      ? expenses
          .filter((expense) => expense.paid_by === input.viewerId)
          .map((expense) => expense.expense_date)
          .sort()[0] ?? null
      : null;

  const attention: AttentionItem[] = buildAttention({
    viewerId: input.viewerId,
    moneyNet: money.totals.net,
    oldestUnsettledExpenseDate,
    overdueChores,
    expiringItems: expiringItems.map((item) => ({ id: item.id, name: item.name })),
    yourIssues: yourIssues.map((issue) => ({ id: issue.id, title: issue.title })),
    today,
  });

  const viewerAssignments = assignments.filter(
    (assignment) => assignment.assigned_to === input.viewerId
  );
  const streakWeeks = calculateStreak(
    viewerAssignments.map((assignment) => ({
      status: assignment.status,
      dueDate: assignment.due_date,
    }))
  );
  const weekScores = input.roommates.map((person) => {
    const theirs = thisWeek.filter(
      (assignment) =>
        assignment.assigned_to === person.id && assignment.status === "completed"
    );
    return {
      id: person.id,
      name: person.name,
      points: totalPoints(
        theirs.map((assignment) => ({
          status: assignment.status,
          pointsAwarded: assignment.points_awarded,
        }))
      ),
      earliestCompletedAt:
        theirs
          .map((assignment) => assignment.completed_at)
          .filter((value): value is string => Boolean(value))
          .sort()[0] ?? null,
    };
  });

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

  const moneyNet = errors.money ? 0 : money.totals.net;
  const vibe = apartmentVibe({
    overdueChores: overdueChores.length,
    openUrgent,
    moneyNet,
    expiring: expiringItems.length,
  });

  return {
    vibe,
    moneyStat: errors.money ? "—" : moneyStatLabel(moneyNet),
    moneyNet,
    foodStat: errors.inventory ? "—" : foodStatLabel(expiringItems.length, lowStockItems.length),
    shoppingStat: errors.shopping ? "—" : shoppingStatLabel(needed.length),
    choreStat: errors.chores ? "—" : choreStatLabel(yourChores.length, overdueChores.length),
    issueStat: errors.issues ? "—" : issueStatLabel(openConcerns.length),
    shoppingCount: needed.length,
    openConcernCount: openConcerns.length,
    expiringItems: expiringItems.slice(0, 3),
    lowStockItems: lowStockItems.slice(0, 3),
    yourChores,
    yourIssues,
    attention,
    recentActivity,
    roommateOfWeek: roommateOfTheWeek(weekScores),
    streak: { weeks: streakWeeks, ...streakCopy(streakWeeks) },
    errors,
  };
}
