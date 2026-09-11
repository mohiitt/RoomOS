import { z } from "zod";
import { handle, HttpError, jsonOk, readJson, requireSession } from "@/lib/server/http";
import { listApartmentBalances, nudgeRoommate } from "@/lib/server/expenses";

const schema = z.object({
  toRoommateId: z.string().uuid(),
});

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const body = await readJson(request, schema);
    if (body.toRoommateId === session.rid) {
      throw new HttpError(400, "You cannot nudge yourself");
    }
    const nets = await listApartmentBalances();
    const yours = nets.find((row) => row.roommateId === session.rid)?.net ?? 0;
    if (yours <= 0) throw new HttpError(400, "You're not owed money right now");
    await nudgeRoommate({
      fromId: session.rid,
      toId: body.toRoommateId,
      amount: yours,
    });
    return jsonOk({ ok: true });
  });
}
