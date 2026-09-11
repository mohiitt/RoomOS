import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/token";
import { handle, jsonOk } from "@/lib/server/http";

export async function POST(request: Request) {
  return handle(request, async () => {
    const response = jsonOk({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return response;
  });
}
