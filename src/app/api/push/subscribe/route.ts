import { z } from "zod";
import { handle, jsonOk, readJson, requireSession } from "@/lib/server/http";
import { savePushSubscription } from "@/lib/push/send.ts";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, schema);
    await savePushSubscription({
      roommateId: session.rid,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: request.headers.get("user-agent"),
    });
    return jsonOk({ ok: true });
  });
}
