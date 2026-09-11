import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "roomos_access";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionPayload = {
  v: 1;
  rid: string;
  iat: number;
  exp: number;
};

function secret() {
  const value = process.env.ROOMOS_SESSION_SECRET;
  if (!value) throw new Error("ROOMOS_SESSION_SECRET is not configured");
  return value;
}

function signBody(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function signSession(roommateId: string, now = Math.floor(Date.now() / 1000)) {
  const payload: SessionPayload = {
    v: 1,
    rid: roommateId,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signBody(body)}`;
}

function equal(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifySession(token: string | undefined | null, now = Math.floor(Date.now() / 1000)) {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  try {
    if (!equal(signature, signBody(body))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (payload.v !== 1 || typeof payload.rid !== "string" || !payload.rid) return null;
    if (typeof payload.exp !== "number" || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(secure = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure,
  };
}
