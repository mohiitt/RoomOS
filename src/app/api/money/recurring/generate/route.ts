import { handle, jsonOk, requireSession } from "@/lib/server/http";
import { generateDueRecurringExpenses } from "@/lib/server/expenses";

export async function POST(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk({ count: await generateDueRecurringExpenses() });
  });
}
