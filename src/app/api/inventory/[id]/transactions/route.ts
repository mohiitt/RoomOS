import { handle, jsonOk, requireSession, routeId } from "@/lib/server/http";
import { listItemTransactions } from "@/lib/server/inventory";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await listItemTransactions(await routeId(context)));
  });
}
