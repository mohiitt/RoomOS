import { handle, jsonOk, requireSession } from "@/lib/server/http";
import { sendTestPush } from "@/lib/push/send.ts";

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    await sendTestPush(session.rid);
    return jsonOk({ ok: true });
  });
}
