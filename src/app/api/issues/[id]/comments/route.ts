import { z } from "zod";
import { handle, jsonOk, readJson, requireSession, routeId } from "@/lib/server/http";
import { addComment, listComments } from "@/lib/server/issues";

const schema = z.object({
  comment: z.string().trim().min(1).max(2000),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await listComments(await routeId(context)));
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, schema);
    return jsonOk(
      await addComment({
        concernId: await routeId(context),
        roommateId: session.rid,
        comment: input.comment,
      })
    );
  });
}
