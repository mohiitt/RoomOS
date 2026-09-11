import { handle, jsonOk, requireSession, routeId } from "@/lib/server/http";
import { deleteExpense, getExpense } from "@/lib/server/expenses";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await getExpense(await routeId(context)));
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    await deleteExpense(await routeId(context));
    return jsonOk({ ok: true });
  });
}
