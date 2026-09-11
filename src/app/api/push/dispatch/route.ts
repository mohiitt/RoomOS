import { verifySession } from "@/lib/auth/token";
import { apartmentCookieFrom } from "@/lib/auth/access.ts";
import { dispatchPendingPush } from "@/lib/push/send.ts";
import { handle, jsonOk, HttpError } from "@/lib/server/http";

export async function POST(request: Request) {
  return handle(request, async () => {
    const secret = process.env.PUSH_DISPATCH_SECRET;
    const header = request.headers.get("authorization");
    const authorized =
      Boolean(verifySession(apartmentCookieFrom(request))) ||
      (Boolean(secret) && header === `Bearer ${secret}`);

    if (!authorized) throw new HttpError(401, "Unlock RoomOS with the PIN first");

    const result = await dispatchPendingPush();
    return jsonOk(result);
  });
}
