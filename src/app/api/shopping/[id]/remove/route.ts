import { handle, jsonOk, requireSession, routeId } from "@/lib/server/http";
import { removeShoppingItem } from "@/lib/server/shopping";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    await removeShoppingItem(await routeId(context));
    return jsonOk({ ok: true });
  });
}
