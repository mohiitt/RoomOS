import { z } from "zod";
import { handle, jsonOk, readJson, requireSession } from "@/lib/server/http";
import { createChore } from "@/lib/server/chores";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).nullable(),
  points: z.number().int().positive().optional(),
  frequency: z.enum(["weekly", "monthly"]).optional(),
  roommateIds: z.array(z.string().uuid()).min(1),
});

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, schema);
    const id = await createChore({
      ...input,
      createdBy: session.rid,
    });
    return jsonOk({ id });
  });
}
