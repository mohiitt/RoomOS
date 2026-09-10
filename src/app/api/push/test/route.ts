import { NextResponse } from "next/server";
import { apartmentCookieFrom, hasValidApartmentCookie, unauthorized } from "@/lib/auth/access.ts";
import { sendTestPush } from "@/lib/push/send.ts";

export async function POST(request: Request) {
  if (!hasValidApartmentCookie(apartmentCookieFrom(request))) return unauthorized();

  const body = (await request.json().catch(() => null)) as { roommateId?: unknown } | null;
  const roommateId = typeof body?.roommateId === "string" ? body.roommateId : "";
  if (!roommateId) {
    return NextResponse.json({ error: "Missing roommate" }, { status: 400 });
  }

  try {
    await sendTestPush(roommateId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send a test alert" },
      { status: 500 }
    );
  }
}
