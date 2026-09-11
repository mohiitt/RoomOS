import { z } from "zod";
import { handle, jsonOk, readJson, requireSession } from "@/lib/server/http";
import { createRecurringExpense, listRecurringExpenses } from "@/lib/server/expenses";

const schema = z.object({
  title: z.string().trim().min(1).max(80),
  amount: z.number().positive(),
  paidBy: z.string().uuid(),
  category: z.string().max(40).nullable(),
  frequency: z.enum(["weekly", "monthly"]),
  nextRunAt: z.string().min(8).max(10),
  splitType: z.enum(["equal", "exact", "percentage", "shares"]).optional(),
  splits: z
    .array(
      z.object({
        roommateId: z.string().uuid(),
        owedAmount: z.number().nonnegative(),
        percentage: z.number().nullable(),
        shares: z.number().nullable(),
      })
    )
    .optional(),
});

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await listRecurringExpenses());
  });
}

export async function POST(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    const input = await readJson(request, schema);
    await createRecurringExpense({
      ...input,
      splitType: input.splitType ?? "equal",
      splits: input.splits ?? [],
    });
    return jsonOk({ ok: true });
  });
}
