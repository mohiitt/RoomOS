import { z } from "zod";
import { handle, jsonOk, readJson, requireSession } from "@/lib/server/http";
import { createConcern, listConcerns } from "@/lib/server/issues";

const schema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().max(2000).nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assignedTo: z.string().uuid().nullable(),
});

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await listConcerns());
  });
}

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, schema);
    return jsonOk(
      await createConcern({
        ...input,
        reportedBy: session.rid,
      })
    );
  });
}
