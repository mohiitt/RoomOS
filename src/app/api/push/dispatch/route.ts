import { NextResponse } from "next/server";
import { apartmentCookieFrom, hasValidApartmentCookie, unauthorized } from "@/lib/auth/access.ts";
import { dispatchPendingPush } from "@/lib/push/send.ts";

export async function POST(request: Request) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  const header = request.headers.get("authorization");
  const authorized =
    hasValidApartmentCookie(apartmentCookieFrom(request)) ||
    (Boolean(secret) && header === `Bearer ${secret}`);

  if (!authorized) return unauthorized();

  try {
    const result = await dispatchPendingPush();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send alerts" },
      { status: 500 }
    );
  }
}
