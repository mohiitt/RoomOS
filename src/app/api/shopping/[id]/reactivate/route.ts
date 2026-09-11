import { z } from "zod";
import { handle, jsonOk, readJson, requireSession, routeId } from "@/lib/server/http";
import { reactivateShoppingItem } from "@/lib/server/shopping";

const schema = z.object({
  requested_quantity: z.number().positive().nullable(),
  unit: z.string().max(24).nullable(),
  reason: z.enum(["manual", "low_stock", "expired", "planned"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, schema);
    return jsonOk(
      await reactivateShoppingItem(await routeId(context), {
        ...input,
        added_by: session.rid,
      })
    );
  });
}
