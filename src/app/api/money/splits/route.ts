import { handle, jsonOk, requireSession } from "@/lib/server/http";
import { listSplits } from "@/lib/server/expenses";

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await listSplits());
  });
}
