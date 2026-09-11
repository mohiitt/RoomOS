import { handle, jsonOk, requireSession } from "@/lib/server/http";
import { pageParams, pageResult } from "@/lib/server/page";
import { listNotifications } from "@/lib/server/notifications";

export async function GET(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const { limit, offset } = pageParams(request, 40, 100);
    const rows = await listNotifications(session.rid, { limit: limit + 1, offset });
    return jsonOk(pageResult(rows, limit));
  });
}
