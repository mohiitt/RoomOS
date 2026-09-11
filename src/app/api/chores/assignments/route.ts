import { handle, jsonOk, requireSession } from "@/lib/server/http";
import { listChoreAssignments } from "@/lib/server/chores";

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await listChoreAssignments());
  });
}
