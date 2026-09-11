import { handle, jsonOk, requireSession } from "@/lib/server/http";
import { countNeededShoppingItems } from "@/lib/server/shopping";

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk({ count: await countNeededShoppingItems() });
  });
}
