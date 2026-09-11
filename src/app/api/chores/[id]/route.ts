import { z } from "zod";
import { handle, jsonOk, readJson, requireSession, routeId } from "@/lib/server/http";
import { updateChore } from "@/lib/server/chores";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).nullable(),
  points: z.number().int().positive().optional(),
  frequency: z.enum(["weekly", "monthly"]).optional(),
  roommateIds: z.array(z.string().uuid()).min(1),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    const input = await readJson(request, schema);
    await updateChore({
      id: await routeId(context),
      ...input,
    });
    return jsonOk({ ok: true });
  });
}
