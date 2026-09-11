import { handle, jsonOk, requireSession, routeId } from "@/lib/server/http";
import { listSplitsForExpense } from "@/lib/server/expenses";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await listSplitsForExpense(await routeId(context)));
  });
}
