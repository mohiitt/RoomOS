import { verifySession } from "./token.ts";

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
  return Boolean(verifySession(cookieValue));
}

export function unauthorized() {
  return Response.json({ error: "Unlock RoomOS with the PIN first" }, { status: 401 });
}
