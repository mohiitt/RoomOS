import { apartmentCookieFrom } from "@/lib/auth/access";
import { verifySession } from "@/lib/auth/token";
import { handle, jsonOk, requireActiveRoommate } from "@/lib/server/http";

export async function GET(request: Request) {
  return handle(
    request,
    async () => {
      const session = verifySession(apartmentCookieFrom(request));
      if (!session) return jsonOk({ unlocked: false, roommateId: null });
      try {
        await requireActiveRoommate(session.rid);
        return jsonOk({ unlocked: true, roommateId: session.rid });
      } catch {
        return jsonOk({ unlocked: false, roommateId: null });
      }
    },
    { origin: false }
  );
}
