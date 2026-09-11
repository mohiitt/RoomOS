import "server-only";
import { getAdminInsforge } from "@/lib/insforge/admin";
import { describeError } from "@/lib/insforge/errors";
import { toNumber, toNumberOrNull } from "@/lib/dates";
import { assertPhotoFile, extensionForPhoto } from "@/lib/server/photos";
import { CONCERN_PHOTOS_BUCKET } from "@/lib/issues/constants.ts";
import { labelForCategory } from "@/lib/expenses/constants.ts";
import type {
  Expense,
  ExpenseAttachment,
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
  const config = Array.isArray(row.split_config) ? row.split_config : [];
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
    split_config: (config as Raw[]).map((share) => ({
      roommate_id: String(share.roommate_id),
      owed_amount: toNumber(share.owed_amount),
      percentage: toNumberOrNull(share.percentage),
      shares: toNumberOrNull(share.shares),
    })),
  };
}

function unwrapRpc(data: unknown): unknown {
  return Array.isArray(data) ? data[0] : data;
}

export async function listApartmentBalances(): Promise<{ roommateId: string; net: number }[]> {
  const { data, error } = await getAdminInsforge().database.rpc("apartment_balances");
  if (error) throw new Error(describeError(error, "Could not load balances"));
  return ((Array.isArray(data) ? data : data ? [data] : []) as Raw[]).map((row) => ({
    roommateId: String(row.roommate_id),
    net: toNumber(row.net),
  }));
}

export async function listExpenses(options?: { limit?: number; offset?: number }): Promise<Expense[]> {
  const limit = Math.min(options?.limit ?? 40, 200);
  const offset = Math.max(options?.offset ?? 0, 0);
  const { data, error } = await getAdminInsforge()
    .database.from("expenses")
    .select(EXPENSE_COLUMNS)
    .is("deleted_at", null)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(describeError(error, "Could not load expenses"));
  return ((data ?? []) as Raw[]).map(mapExpense);
}

export async function getExpense(id: string): Promise<Expense> {
  const { data, error } = await getAdminInsforge()
    .database.from("expenses")
    .select(EXPENSE_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) throw new Error(describeError(error, "Could not load expense"));
  return mapExpense(data as Raw);
}

export async function listSplits(expenseIds?: string[]): Promise<ExpenseSplit[]> {
  let query = getAdminInsforge()
    .database.from("expense_splits")
    .select("id, expense_id, roommate_id, owed_amount, percentage, shares, created_at");
  if (expenseIds && expenseIds.length > 0) {
    query = query.in("expense_id", expenseIds);
  } else if (expenseIds) {
    return [];
  } else {
    query = query.limit(2000);
  }

  const { data, error } = await query;
  if (error) throw new Error(describeError(error, "Could not load splits"));
  return ((data ?? []) as Raw[]).map(mapSplit);
}

export async function listSplitsForExpense(expenseId: string): Promise<ExpenseSplit[]> {
  const { data, error } = await getAdminInsforge()
    .database.from("expense_splits")
    .select("id, expense_id, roommate_id, owed_amount, percentage, shares, created_at")
    .eq("expense_id", expenseId)
    .limit(20);

  if (error) throw new Error(describeError(error, "Could not load splits"));
  return ((data ?? []) as Raw[]).map(mapSplit);
}

export async function listSettlements(options?: { limit?: number; offset?: number }): Promise<Settlement[]> {
  const limit = Math.min(options?.limit ?? 40, 200);
  const offset = Math.max(options?.offset ?? 0, 0);
  const { data, error } = await getAdminInsforge()
    .database.from("settlements")
    .select("id, payer_id, receiver_id, amount, settled_at, note, created_by, created_at")
    .is("deleted_at", null)
    .order("settled_at", { ascending: false })
    .range(offset, offset + limit - 1);

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
  const { data, error } = await getAdminInsforge().database.rpc("save_expense", {
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
  const { error } = await getAdminInsforge()
    .database.from("expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(describeError(error, "Could not delete expense"));
}

export async function createSettlement(input: {
  payerId: string;
  receiverId: string;
  amount: number;
  note: string | null;
  createdBy: string;
}): Promise<void> {
  const { error } = await getAdminInsforge().database.rpc("create_settlement", {
    p_payer_id: input.payerId,
    p_receiver_id: input.receiverId,
    p_amount: input.amount,
    p_note: input.note,
    p_created_by: input.createdBy,
  });
  if (error) throw new Error(describeError(error, "Could not record settlement"));
}

export async function listRecurringExpenses(): Promise<RecurringExpense[]> {
  const { data, error } = await getAdminInsforge()
    .database.from("recurring_expenses")
    .select("id, title, amount, paid_by, category, split_type, frequency, next_run_at, is_active, created_at, split_config")
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
  splitType: SplitType;
  splits: SplitResult[];
}): Promise<void> {
  const splitConfig =
    input.splitType === "equal"
      ? []
      : input.splits.map((split) => ({
          roommate_id: split.roommateId,
          owed_amount: split.owedAmount,
          percentage: split.percentage,
          shares: split.shares,
        }));
  const { error } = await getAdminInsforge()
    .database.from("recurring_expenses")
    .insert([
      {
        title: input.title,
        amount: input.amount,
        paid_by: input.paidBy,
        category: input.category,
        split_type: input.splitType,
        frequency: input.frequency,
        next_run_at: input.nextRunAt,
        is_active: true,
        split_config: splitConfig,
      },
    ]);

  if (error) throw new Error(describeError(error, "Could not save recurring expense"));
}

export async function setRecurringActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await getAdminInsforge()
    .database.from("recurring_expenses")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(describeError(error, "Could not update recurring expense"));
}

export async function generateDueRecurringExpenses(): Promise<number> {
  const { data, error } = await getAdminInsforge().database.rpc("generate_due_recurring_expenses");
  if (error) throw new Error(describeError(error, "Could not generate recurring expenses"));
  const value = unwrapRpc(data);
  return toNumber(value);
}

const ATTACHMENT_COLUMNS =
  "id, expense_id, storage_path, storage_url, uploaded_by, created_at";

function mapAttachment(row: Raw): ExpenseAttachment {
  return {
    id: String(row.id),
    expense_id: String(row.expense_id),
    storage_path: String(row.storage_path),
    storage_url: String(row.storage_url),
    uploaded_by: (row.uploaded_by as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export async function listExpenseAttachments(expenseId: string): Promise<ExpenseAttachment[]> {
  const { data, error } = await getAdminInsforge()
    .database.from("expense_attachments")
    .select(ATTACHMENT_COLUMNS)
    .eq("expense_id", expenseId)
    .order("created_at", { ascending: true })
    .limit(12);

  if (error) throw new Error(describeError(error, "Could not load receipts"));
  return ((data ?? []) as Raw[]).map(mapAttachment);
}

export async function getExpenseAttachment(
  expenseId: string,
  attachmentId: string
): Promise<ExpenseAttachment> {
  const { data, error } = await getAdminInsforge()
    .database.from("expense_attachments")
    .select(ATTACHMENT_COLUMNS)
    .eq("id", attachmentId)
    .eq("expense_id", expenseId)
    .limit(1);

  if (error || !data?.[0]) throw new Error(describeError(error, "Could not load receipt"));
  return mapAttachment(data[0] as Raw);
}

export async function downloadExpensePhoto(path: string): Promise<Blob> {
  const { data, error } = await getAdminInsforge()
    .storage.from(CONCERN_PHOTOS_BUCKET)
    .download(path);
  if (error || !data) throw new Error(describeError(error, "Could not load receipt"));
  return data as Blob;
}

export async function uploadExpensePhoto(input: {
  expenseId: string;
  roommateId: string;
  file: File;
}): Promise<ExpenseAttachment> {
  assertPhotoFile(input.file);
  const existing = await listExpenseAttachments(input.expenseId);
  if (existing.length >= 8) throw new Error("This expense already has 8 photos");

  const key = `expenses/${input.expenseId}/${crypto.randomUUID()}.${extensionForPhoto(input.file)}`;
  const { data: uploaded, error: uploadError } = await getAdminInsforge()
    .storage.from(CONCERN_PHOTOS_BUCKET)
    .upload(key, input.file);

  if (uploadError || !uploaded) {
    throw new Error(describeError(uploadError, "Could not upload receipt"));
  }

  const storagePath = String((uploaded as { key?: string }).key ?? key);
  const storageUrl = `/api/money/expenses/${input.expenseId}/photos/${storagePath}`;

  const { data, error } = await getAdminInsforge()
    .database.from("expense_attachments")
    .insert([
      {
        expense_id: input.expenseId,
        storage_path: storagePath,
        storage_url: storageUrl,
        uploaded_by: input.roommateId,
      },
    ])
    .select(ATTACHMENT_COLUMNS);

  if (error || !data?.[0]) {
    await getAdminInsforge().storage.from(CONCERN_PHOTOS_BUCKET).remove(storagePath).catch(() => undefined);
    throw new Error(describeError(error, "Could not save receipt"));
  }
  return mapAttachment(data[0] as Raw);
}

export async function spendSummary() {
  const expenses = await listExpenses({ limit: 500, offset: 0 });
  const byCategory = new Map<string, number>();
  const byMonth = new Map<string, number>();
  for (const expense of expenses) {
    const category = expense.category || "other";
    byCategory.set(category, (byCategory.get(category) ?? 0) + expense.amount);
    const month = expense.expense_date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + expense.amount);
  }
  return {
    total: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    count: expenses.length,
    categories: [...byCategory.entries()]
      .map(([category, amount]) => ({ category, label: labelForCategory(category), amount }))
      .sort((a, b) => b.amount - a.amount),
    months: [...byMonth.entries()]
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => (a.month < b.month ? 1 : -1)),
  };
}

export async function expensesCsv(): Promise<string> {
  const expenses = await listExpenses({ limit: 500, offset: 0 });
  const splits = await listSplits(expenses.map((expense) => expense.id));
  const header = "date,title,category,amount,paid_by,split_type,created_by,id";
  const rows = expenses.map((expense) =>
    [
      expense.expense_date,
      csvCell(expense.title),
      csvCell(expense.category ?? ""),
      expense.amount.toFixed(2),
      expense.paid_by,
      expense.split_type,
      expense.created_by ?? "",
      expense.id,
    ].join(",")
  );
  const splitHeader = "expense_id,roommate_id,owed_amount";
  const splitRows = splits.map((split) =>
    [split.expense_id, split.roommate_id, split.owed_amount.toFixed(2)].join(",")
  );
  return [header, ...rows, "", splitHeader, ...splitRows].join("\n");
}

function csvCell(value: string) {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

export async function nudgeRoommate(input: {
  fromId: string;
  toId: string;
  amount: number;
}): Promise<void> {
  const { error } = await getAdminInsforge().database.rpc("insert_notifications", {
    p_roommate_ids: [input.toId],
    p_type: "money_nudge",
    p_title: "Pay up when you can",
    p_message: "Someone is owed money and sent a nudge.",
    p_entity_type: "settlement",
    p_entity_id: input.fromId,
  });
  if (error) throw new Error(describeError(error, "Could not send a nudge"));
  void input.amount;
}
