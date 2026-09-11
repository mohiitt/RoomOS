import { handle, jsonOk, requireSession } from "@/lib/server/http";
import { countUnreadNotifications } from "@/lib/server/notifications";

export async function GET(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    return jsonOk({ count: await countUnreadNotifications(session.rid) });
  });
}
