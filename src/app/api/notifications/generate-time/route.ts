import { handle, jsonOk, requireSession } from "@/lib/server/http";
import { generateTimeNotifications } from "@/lib/server/notifications";

export async function POST(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk({ count: await generateTimeNotifications() });
  });
}
