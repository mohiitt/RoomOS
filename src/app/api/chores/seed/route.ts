import { z } from "zod";
import { handle, jsonOk, readJson, requireSession } from "@/lib/server/http";
import { seedDefaultChores } from "@/lib/server/chores";

const schema = z.object({
  roommateIds: z.array(z.string().uuid()).min(1),
});

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, schema);
    await seedDefaultChores(session.rid, input.roommateIds);
    return jsonOk({ ok: true });
  });
}
