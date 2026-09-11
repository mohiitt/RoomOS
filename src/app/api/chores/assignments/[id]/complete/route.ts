import { z } from "zod";
import { handle, jsonOk, readJson, requireSession, routeId } from "@/lib/server/http";
import { completeChoreAssignment } from "@/lib/server/chores";

const schema = z.object({
  forSomeoneElse: z.boolean().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, schema);
    await completeChoreAssignment(
      await routeId(context),
      session.rid,
      Boolean(input.forSomeoneElse)
    );
    return jsonOk({ ok: true });
  });
}
