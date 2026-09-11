import { z } from "zod";
import { handle, jsonOk, readJson, requireSession } from "@/lib/server/http";
import { createShoppingItem, listShoppingItems } from "@/lib/server/shopping";
import type { ShoppingStatus } from "@/types/database";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  requested_quantity: z.number().positive().nullable(),
  unit: z.string().max(24).nullable(),
  reason: z.enum(["manual", "low_stock", "expired", "planned"]),
  inventory_item_id: z.string().uuid().nullable().optional(),
});

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    const status = new URL(request.url).searchParams.get("status") ?? "needed";
    if (status !== "needed" && status !== "purchased" && status !== "removed") {
      return jsonOk([]);
    }
    return jsonOk(await listShoppingItems(status as ShoppingStatus));
  });
}

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, createSchema);
    return jsonOk(
      await createShoppingItem({
        ...input,
        added_by: session.rid,
      })
    );
  });
}
