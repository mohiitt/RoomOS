import { handle, jsonOk, requireSession } from "@/lib/server/http";
import { markAllNotificationsRead } from "@/lib/server/notifications";

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    await markAllNotificationsRead(session.rid);
    return jsonOk({ ok: true });
  });
}
