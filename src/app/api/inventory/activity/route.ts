import { handle, jsonOk, requireSession } from "@/lib/server/http";
import { listRecentInventoryTransactions } from "@/lib/server/inventory";

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await listRecentInventoryTransactions());
  });
}
