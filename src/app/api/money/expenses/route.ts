import { z } from "zod";
import { handle, jsonOk, readJson, requireSession } from "@/lib/server/http";
import { pageParams, pageResult } from "@/lib/server/page";
import { listExpenses, listSplits, saveExpense } from "@/lib/server/expenses";

const splitSchema = z.object({
  roommateId: z.string().uuid(),
  owedAmount: z.number().nonnegative(),
  percentage: z.number().nullable(),
  shares: z.number().nullable(),
});

const saveSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(80),
  description: z.string().max(500).nullable(),
  amount: z.number().positive(),
  paidBy: z.string().uuid(),
  category: z.string().max(40).nullable(),
  splitType: z.enum(["equal", "exact", "percentage", "shares"]),
  expenseDate: z.string().min(8).max(10),
  splits: z.array(splitSchema).min(1),
});

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    const { limit, offset } = pageParams(request, 20, 50);
    const rows = await listExpenses({ limit: limit + 1, offset });
    const page = pageResult(rows, limit);
    const splits = await listSplits(page.items.map((expense) => expense.id));
    return jsonOk({ ...page, splits });
  });
}

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, saveSchema);
    const id = await saveExpense({
      ...input,
      createdBy: session.rid,
    });
    return jsonOk({ id });
  });
}
