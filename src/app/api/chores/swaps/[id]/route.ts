import { z } from "zod";
import { handle, jsonOk, readJson, requireSession, routeId } from "@/lib/server/http";
import { respondChoreSwap } from "@/lib/server/chores";

const schema = z.object({
  accept: z.boolean(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, schema);
    await respondChoreSwap(await routeId(context), session.rid, input.accept);
    return jsonOk({ ok: true });
  });
}
