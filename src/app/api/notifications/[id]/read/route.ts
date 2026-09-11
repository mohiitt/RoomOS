import { handle, jsonOk, requireSession, routeId } from "@/lib/server/http";
import { markNotificationRead } from "@/lib/server/notifications";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    const session = await requireSession(request);
    await markNotificationRead(await routeId(context), session.rid);
    return jsonOk({ ok: true });
  });
}
