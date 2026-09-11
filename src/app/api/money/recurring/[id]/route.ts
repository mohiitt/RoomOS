import { z } from "zod";
import { handle, jsonOk, readJson, requireSession, routeId } from "@/lib/server/http";
import { setRecurringActive } from "@/lib/server/expenses";

const schema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    const input = await readJson(request, schema);
    await setRecurringActive(await routeId(context), input.isActive);
    return jsonOk({ ok: true });
  });
}
