import { handle, jsonOk, requireSession, routeId } from "@/lib/server/http";
import { deleteRecipe, getRecipe } from "@/lib/server/recipes";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await getRecipe(await routeId(context)));
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
