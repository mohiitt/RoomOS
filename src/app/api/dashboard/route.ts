import { handle, jsonOk, listActiveRoommates, requireSession } from "@/lib/server/http";
import { getDashboardData } from "@/lib/server/dashboard";

export async function GET(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const roommates = await listActiveRoommates();
    return jsonOk(await getDashboardData({ viewerId: session.rid, roommates }));
  });
}
