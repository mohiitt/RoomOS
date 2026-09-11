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
    await createRecurringExpense(input);
    return jsonOk({ ok: true });
  });
}
