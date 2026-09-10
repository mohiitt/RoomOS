import { NextResponse } from "next/server";
import { apartmentCookieFrom, hasValidApartmentCookie, unauthorized } from "@/lib/auth/access.ts";
import { savePushSubscription } from "@/lib/push/send.ts";

export async function POST(request: Request) {
  if (!hasValidApartmentCookie(apartmentCookieFrom(request))) return unauthorized();

  const body = (await request.json().catch(() => null)) as {
    roommateId?: unknown;
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  } | null;

  const roommateId = typeof body?.roommateId === "string" ? body.roommateId : "";
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : "";

  if (!roommateId || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Subscription is incomplete" }, { status: 400 });
  }

  try {
    await savePushSubscription({
      roommateId,
      endpoint,
      p256dh,
      auth,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not subscribe" },
      { status: 500 }
    );
  }
}
