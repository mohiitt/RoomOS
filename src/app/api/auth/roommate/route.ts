import { z } from "zod";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/token";
import { handle, jsonOk, readJson, requireActiveRoommate, requireSession } from "@/lib/server/http";

const schema = z.object({
  roommateId: z.string().uuid("Pick a roommate"),
});

export async function POST(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    const body = await readJson(request, schema);
    await requireActiveRoommate(body.roommateId);
    const response = jsonOk({ ok: true, roommateId: body.roommateId });
    response.cookies.set(SESSION_COOKIE, signSession(body.roommateId), sessionCookieOptions());
    return response;
  });
}
