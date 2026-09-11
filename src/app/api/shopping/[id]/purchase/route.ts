import { z } from "zod";
import { handle, jsonOk, readJson, requireSession, routeId } from "@/lib/server/http";
import { purchaseShoppingItem } from "@/lib/server/shopping";

const schema = z.object({
  quantity: z.number().positive(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, schema);
    return jsonOk(
      await purchaseShoppingItem({
        shoppingId: await routeId(context),
        roommateId: session.rid,
        quantity: input.quantity,
      })
    );
  });
}
