import { z } from "zod";
import { handle, jsonOk, readJson, requireSession } from "@/lib/server/http";
import { listPendingSwaps, requestChoreSwap } from "@/lib/server/chores";

const schema = z.object({
  assignmentId: z.string().uuid(),
  toRoommateId: z.string().uuid(),
});

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await listPendingSwaps());
  });
}

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, schema);
    await requestChoreSwap(input.assignmentId, session.rid, input.toRoommateId);
    return jsonOk({ ok: true });
  });
}
