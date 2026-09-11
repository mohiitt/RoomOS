import { apiJson } from "@/lib/api/browser";
import type {
  Expense,
  ExpenseAttachment,
  ExpenseSplit,
  RecurringExpense,
  Settlement,
  SplitType,
} from "@/types/database";
import type { SplitResult } from "@/lib/expenses/validateSplit.ts";

export type ExpensePage = {
  items: Expense[];
  splits: ExpenseSplit[];
  hasMore: boolean;
};

export type SettlementPage = {
  items: Settlement[];
  hasMore: boolean;
};

export async function listBalances(): Promise<{ roommateId: string; net: number }[]> {
  const payload = await apiJson<{ nets: { roommateId: string; net: number }[] }>(
    "/api/money/balances"
  );
  return payload.nets;
}

export async function listExpensePage(offset = 0, limit = 20): Promise<ExpensePage> {
  return apiJson<ExpensePage>(`/api/money/expenses?limit=${limit}&offset=${offset}`);
}

export async function listExpenses(): Promise<Expense[]> {
  const page = await listExpensePage(0, 20);
  return page.items;
}

export async function getExpense(id: string): Promise<Expense> {
  return apiJson<Expense>(`/api/money/expenses/${id}`);
}

export async function listSplits(): Promise<ExpenseSplit[]> {
  return apiJson<ExpenseSplit[]>("/api/money/splits");
}

export async function listSplitsForExpense(expenseId: string): Promise<ExpenseSplit[]> {
  return apiJson<ExpenseSplit[]>(`/api/money/expenses/${expenseId}/splits`);
}

export async function listSettlementPage(offset = 0, limit = 20): Promise<SettlementPage> {
  return apiJson<SettlementPage>(`/api/money/settlements?limit=${limit}&offset=${offset}`);
}

export async function listSettlements(): Promise<Settlement[]> {
  const page = await listSettlementPage(0, 20);
  return page.items;
}

export async function saveExpense(input: {
  id?: string | null;
  title: string;
  description: string | null;
  amount: number;
  paidBy: string;
  category: string | null;
  splitType: SplitType;
  expenseDate: string;
  createdBy: string;
  splits: SplitResult[];
}): Promise<string> {
  const payload = await apiJson<{ id: string }>("/api/money/expenses", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.id;
}

export async function deleteExpense(id: string): Promise<void> {
  await apiJson(`/api/money/expenses/${id}`, { method: "DELETE" });
}

export async function createSettlement(input: {
  payerId: string;
  receiverId: string;
  amount: number;
  note: string | null;
  createdBy: string;
}): Promise<void> {
  await apiJson("/api/money/settlements", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listRecurringExpenses(): Promise<RecurringExpense[]> {
  return apiJson<RecurringExpense[]>("/api/money/recurring");
}

export async function createRecurringExpense(input: {
  title: string;
  amount: number;
  paidBy: string;
  category: string | null;
  frequency: "weekly" | "monthly";
  nextRunAt: string;
  splitType?: SplitType;
  splits?: SplitResult[];
}): Promise<void> {
  await apiJson("/api/money/recurring", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function generateDueRecurringExpenses(): Promise<number> {
  const payload = await apiJson<{ count: number }>("/api/money/recurring/generate", {
    method: "POST",
  });
  return payload.count;
}

export async function uploadExpensePhoto(expenseId: string, file: File): Promise<ExpenseAttachment> {
  const body = new FormData();
  body.append("file", file);
  return apiJson<ExpenseAttachment>(`/api/money/expenses/${expenseId}/photos`, {
    method: "POST",
    body,
  });
}

export async function listExpensePhotos(expenseId: string): Promise<ExpenseAttachment[]> {
  return apiJson<ExpenseAttachment[]>(`/api/money/expenses/${expenseId}/photos`);
}

export async function nudgeRoommate(toRoommateId: string) {
  await apiJson("/api/money/nudge", {
    method: "POST",
    body: JSON.stringify({ toRoommateId }),
  });
}

export async function fetchSpendSummary() {
  return apiJson<{
    total: number;
    count: number;
    categories: { category: string; label: string; amount: number }[];
    months: { month: string; amount: number }[];
  }>("/api/money/summary");
}

export async function setRecurringActive(id: string, isActive: boolean): Promise<void> {
  await apiJson(`/api/money/recurring/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}
