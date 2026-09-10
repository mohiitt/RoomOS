import { createHmac, timingSafeEqual } from "node:crypto";

export function expectedAccessToken() {
  const secret = process.env.ROOMOS_SESSION_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update("roomos-access").digest("hex");
}

export function apartmentCookieFrom(request: Request) {
  const raw = request.headers.get("cookie")?.match(/(?:^|; )roomos_access=([^;]*)/)?.[1];
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function hasValidApartmentCookie(cookieValue: string | undefined) {
  const expected = expectedAccessToken();
  if (!expected || !cookieValue) return false;
  const actual = Buffer.from(cookieValue);
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export function unauthorized() {
  return Response.json({ error: "Unlock RoomOS with the PIN first" }, { status: 401 });
}
