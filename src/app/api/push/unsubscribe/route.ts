import { NextResponse } from "next/server";
import { apartmentCookieFrom, hasValidApartmentCookie, unauthorized } from "@/lib/auth/access.ts";
import { deletePushSubscription } from "@/lib/push/send.ts";

export async function POST(request: Request) {
  if (!hasValidApartmentCookie(apartmentCookieFrom(request))) return unauthorized();

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  try {
    await deletePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not unsubscribe" },
      { status: 500 }
    );
  }
}
