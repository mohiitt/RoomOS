import { handle, jsonOk, requireSession } from "@/lib/server/http";
import { generateDueChoreAssignments } from "@/lib/server/chores";

export async function POST(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk({ count: await generateDueChoreAssignments() });
  });
}
