import { handle, jsonOk, requireSession } from "@/lib/server/http";
import { findNeededByInventoryId, findRemovedByInventoryId } from "@/lib/server/shopping";

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    const url = new URL(request.url);
    const inventoryItemId = url.searchParams.get("inventoryItemId") ?? "";
    const status = url.searchParams.get("status");
    if (!inventoryItemId) return jsonOk(null);
    if (status === "removed") return jsonOk(await findRemovedByInventoryId(inventoryItemId));
    return jsonOk(await findNeededByInventoryId(inventoryItemId));
  });
}
