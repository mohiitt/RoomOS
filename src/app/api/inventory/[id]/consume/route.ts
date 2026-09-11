import { z } from "zod";
import { handle, jsonOk, readJson, requireSession, routeId } from "@/lib/server/http";
import { getInventoryItem } from "@/lib/server/inventory";
import { consumeInventory } from "@/lib/server/inventoryAdjust";

const schema = z.object({
  amount: z.number().positive(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const item = await getInventoryItem(await routeId(context));
    const input = await readJson(request, schema);
    return jsonOk(await consumeInventory(item, input.amount, session.rid));
  });
}
