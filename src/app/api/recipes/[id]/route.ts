import { z } from "zod";
import { handle, jsonOk, readJson, requireSession, routeId } from "@/lib/server/http";
import { deleteRecipe, getRecipe, updateRecipe } from "@/lib/server/recipes";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  instructions: z.string().trim().min(1).max(4000),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        quantity: z.string().trim().min(1).max(40),
        unit: z.string().max(24),
      })
    )
    .min(1),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await getRecipe(await routeId(context)));
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    const input = await readJson(request, schema);
    return jsonOk(await updateRecipe({ id: await routeId(context), ...input }));
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    await deleteRecipe(await routeId(context));
    return jsonOk({ ok: true });
  });
}
