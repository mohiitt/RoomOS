import { z } from "zod";
import { handle, jsonOk, readJson, requireSession, routeId } from "@/lib/server/http";
import { adjustInventoryQuantity } from "@/lib/server/inventoryAdjust";

const schema = z.object({
  transactionType: z.enum(["consume", "add", "adjust", "discard"]),
  quantityChange: z.number(),
  note: z.string().max(200).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const itemId = await routeId(context);
    const input = await readJson(request, schema);
    return jsonOk(
      await adjustInventoryQuantity({
        itemId,
        roommateId: session.rid,
        transactionType: input.transactionType,
        quantityChange: input.quantityChange,
        note: input.note,
      })
    );
  });
}
