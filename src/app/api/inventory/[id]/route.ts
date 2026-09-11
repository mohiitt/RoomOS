import { z } from "zod";
import {
  handle,
  jsonOk,
  readJson,
  requireSession,
  routeId,
} from "@/lib/server/http";
import {
  deleteInventoryItem,
  getInventoryItem,
  updateInventoryItem,
} from "@/lib/server/inventory";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(24),
  category: z.string().max(40),
  storage_location: z.enum(["fridge", "freezer", "pantry", "kitchen", "other"]),
  ownership_type: z.enum(["shared", "personal"]),
  owner_id: z.string().uuid().nullable(),
  expiry_date: z.string().nullable(),
  minimum_quantity: z.number().nonnegative().nullable(),
  auto_add_to_shopping: z.boolean(),
  notes: z.string().max(1000).nullable(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await getInventoryItem(await routeId(context)));
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    const id = await routeId(context);
    const input = await readJson(request, updateSchema);
    return jsonOk(await updateInventoryItem(id, input));
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    await deleteInventoryItem(await routeId(context));
    return jsonOk({ ok: true });
  });
}
