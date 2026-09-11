import { z } from "zod";
import { handle, jsonOk, readJson, requireSession } from "@/lib/server/http";
import { deletePushSubscription } from "@/lib/push/send.ts";

const schema = z.object({
  endpoint: z.string().min(1),
});

export async function POST(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    const input = await readJson(request, schema);
    await deletePushSubscription(input.endpoint);
    return jsonOk({ ok: true });
  });
}
