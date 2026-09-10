import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { pin?: unknown } | null;
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
  const expected = process.env.ROOMOS_PIN_HASH;
  const secret = process.env.ROOMOS_SESSION_SECRET;

  if (!expected || !secret) {
    return NextResponse.json(
      { error: "PIN is not configured on the server" },
      { status: 500 }
    );
  }

  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Enter the 4-digit apartment PIN" }, { status: 400 });
  }

  const actual = createHash("sha256").update(pin).digest("hex");
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return NextResponse.json({ error: "That PIN is not right" }, { status: 401 });
  }

  const token = createHmac("sha256", secret).update("roomos-access").digest("hex");
  const response = NextResponse.json({ ok: true });
  response.cookies.set("roomos_access", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
