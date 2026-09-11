import { z } from "zod";
import { handle, jsonOk, readJson, requireSession, routeId } from "@/lib/server/http";
import { getConcern, updateConcern } from "@/lib/server/issues";

const schema = z.object({
  status: z.enum(["open", "assigned", "in_progress", "resolved"]).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  title: z.string().trim().min(1).max(80).optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await getConcern(await routeId(context)));
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, schema);
    return jsonOk(
      await updateConcern(await routeId(context), {
        ...input,
        actorId: session.rid,
      })
    );
  });
}
