import { z } from "zod";
import {
  handle,
  jsonOk,
  readJson,
  requireActiveRoommate,
  requireSession,
} from "@/lib/server/http";
import {
  createInventoryItem,
  listInventoryItems,
} from "@/lib/server/inventory";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  quantity: z.number().nonnegative(),
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

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await listInventoryItems());
  });
}

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    await requireActiveRoommate(session.rid);
    const input = await readJson(request, createSchema);
    const item = await createInventoryItem({
      ...input,
      created_by: session.rid,
    });
    return jsonOk(item);
  });
}
