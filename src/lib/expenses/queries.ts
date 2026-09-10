import { describeError, getInsforge } from "@/lib/insforge/client";
import { toNumber, toNumberOrNull } from "@/lib/dates";
import type {
  Expense,
  ExpenseSplit,
  RecurringExpense,
  Settlement,
  SplitType,
} from "@/types/database";
import type { SplitResult } from "@/lib/expenses/validateSplit.ts";

type Raw = Record<string, unknown>;

const EXPENSE_COLUMNS =
  "id, title, description, amount, currency, paid_by, category, split_type, expense_date, is_recurring, recurring_rule_id, created_by, created_at, updated_at";

function mapExpense(row: Raw): Expense {
  return {
    id: String(row.id),
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    amount: toNumber(row.amount),
    currency: String(row.currency ?? "USD"),
    paid_by: String(row.paid_by),
    category: (row.category as string | null) ?? null,
    split_type: row.split_type as SplitType,
    expense_date: String(row.expense_date),
    is_recurring: Boolean(row.is_recurring),
    recurring_rule_id: (row.recurring_rule_id as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapSplit(row: Raw): ExpenseSplit {
  return {
    id: String(row.id),
    expense_id: String(row.expense_id),
    roommate_id: String(row.roommate_id),
    owed_amount: toNumber(row.owed_amount),
    percentage: toNumberOrNull(row.percentage),
    shares: toNumberOrNull(row.shares),
    created_at: String(row.created_at),
  };
}

function mapSettlement(row: Raw): Settlement {
  return {
    id: String(row.id),
    payer_id: String(row.payer_id),
    receiver_id: String(row.receiver_id),
    amount: toNumber(row.amount),
    settled_at: String(row.settled_at),
    note: (row.note as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

function mapRecurring(row: Raw): RecurringExpense {
  return {
    id: String(row.id),
    title: String(row.title),
    amount: toNumber(row.amount),
    paid_by: (row.paid_by as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    split_type: (row.split_type as SplitType) ?? "equal",
    frequency: row.frequency === "weekly" ? "weekly" : row.frequency === "custom" ? "custom" : "monthly",
    next_run_at: String(row.next_run_at),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
  };
}

function unwrapRpc(data: unknown): unknown {
  return Array.isArray(data) ? data[0] : data;
}

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await getInsforge()
    .database.from("expenses")
    .select(EXPENSE_COLUMNS)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load expenses"));
  return ((data ?? []) as Raw[]).map(mapExpense);
}

export async function getExpense(id: string): Promise<Expense> {
  const { data, error } = await getInsforge()
    .database.from("expenses")
    .select(EXPENSE_COLUMNS)
    .eq("id", id)
    .single();

  if (error || !data) throw new Error(describeError(error, "Could not load expense"));
  return mapExpense(data as Raw);
}

export async function listSplits(): Promise<ExpenseSplit[]> {
  const { data, error } = await getInsforge()
    .database.from("expense_splits")
    .select("id, expense_id, roommate_id, owed_amount, percentage, shares, created_at")
    .limit(1000);

  if (error) throw new Error(describeError(error, "Could not load splits"));
  return ((data ?? []) as Raw[]).map(mapSplit);
}

export async function listSplitsForExpense(expenseId: string): Promise<ExpenseSplit[]> {
  const { data, error } = await getInsforge()
    .database.from("expense_splits")
    .select("id, expense_id, roommate_id, owed_amount, percentage, shares, created_at")
    .eq("expense_id", expenseId)
    .limit(20);

  if (error) throw new Error(describeError(error, "Could not load splits"));
  return ((data ?? []) as Raw[]).map(mapSplit);
}

export async function listSettlements(): Promise<Settlement[]> {
  const { data, error } = await getInsforge()
    .database.from("settlements")
    .select("id, payer_id, receiver_id, amount, settled_at, note, created_by, created_at")
    .order("settled_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load settlements"));
  return ((data ?? []) as Raw[]).map(mapSettlement);
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
  const { data, error } = await getInsforge().database.rpc("save_expense", {
    p_id: input.id ?? null,
    p_title: input.title,
    p_description: input.description,
    p_amount: input.amount,
    p_paid_by: input.paidBy,
    p_category: input.category,
    p_split_type: input.splitType,
    p_expense_date: input.expenseDate,
    p_created_by: input.createdBy,
    p_splits: input.splits.map((split) => ({
      roommate_id: split.roommateId,
      owed_amount: split.owedAmount,
      percentage: split.percentage,
      shares: split.shares,
    })),
    p_is_recurring: false,
    p_recurring_rule_id: null,
  });

  if (error) throw new Error(describeError(error, "Could not save expense"));
  const id = unwrapRpc(data);
  if (!id) throw new Error("Could not save expense");
  return String(id);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await getInsforge().database.from("expenses").delete().eq("id", id);
  if (error) throw new Error(describeError(error, "Could not delete expense"));
}

export async function createSettlement(input: {
  payerId: string;
  receiverId: string;
  amount: number;
  note: string | null;
  createdBy: string;
}): Promise<void> {
  const { error } = await getInsforge().database.rpc("create_settlement", {
    p_payer_id: input.payerId,
    p_receiver_id: input.receiverId,
    p_amount: input.amount,
    p_note: input.note,
    p_created_by: input.createdBy,
  });
  if (error) throw new Error(describeError(error, "Could not record settlement"));
}

export async function listRecurringExpenses(): Promise<RecurringExpense[]> {
  const { data, error } = await getInsforge()
    .database.from("recurring_expenses")
    .select("id, title, amount, paid_by, category, split_type, frequency, next_run_at, is_active, created_at")
    .order("next_run_at", { ascending: true })
    .limit(50);

  if (error) throw new Error(describeError(error, "Could not load recurring expenses"));
  return ((data ?? []) as Raw[]).map(mapRecurring);
}

export async function createRecurringExpense(input: {
  title: string;
  amount: number;
  paidBy: string;
  category: string | null;
  frequency: "weekly" | "monthly";
  nextRunAt: string;
}): Promise<void> {
  const { error } = await getInsforge()
    .database.from("recurring_expenses")
    .insert([
      {
        title: input.title,
        amount: input.amount,
        paid_by: input.paidBy,
        category: input.category,
        split_type: "equal",
        frequency: input.frequency,
        next_run_at: input.nextRunAt,
        is_active: true,
      },
    ]);

  if (error) throw new Error(describeError(error, "Could not save recurring expense"));
}

export async function setRecurringActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await getInsforge()
    .database.from("recurring_expenses")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(describeError(error, "Could not update recurring expense"));
}

export async function generateDueRecurringExpenses(): Promise<number> {
  const { data, error } = await getInsforge().database.rpc("generate_due_recurring_expenses");
  if (error) throw new Error(describeError(error, "Could not generate recurring expenses"));
  const value = unwrapRpc(data);
  return toNumber(value);
}
