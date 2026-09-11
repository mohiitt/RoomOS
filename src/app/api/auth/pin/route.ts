import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth/token";
import { getAdminInsforge } from "@/lib/insforge/admin";
import { describeError } from "@/lib/insforge/errors";
import { HttpError, clientIp, handle, jsonOk, readJson, requireActiveRoommate } from "@/lib/server/http";

const pinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, "Enter the 4-digit apartment PIN"),
  roommateId: z.string().uuid("Pick your name first"),
});

const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

function pinMatches(pin: string, expected: string) {
  const actual = createHash("sha256").update(pin).digest("hex");
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

async function recentFailures(ip: string) {
  const since = new Date(Date.now() - FAILURE_WINDOW_MS).toISOString();
  const { data, error } = await getAdminInsforge()
    .database.from("pin_attempts")
    .select("id")
    .eq("ip", ip)
    .eq("success", false)
    .gte("attempted_at", since)
    .limit(20);
  if (error) throw new Error(describeError(error, "Could not check PIN attempts"));
  return (data ?? []).length;
}

async function recordAttempt(ip: string, success: boolean) {
  const { error } = await getAdminInsforge()
    .database.from("pin_attempts")
    .insert([{ ip, success }]);
  if (error) console.error("[roomos] pin attempt log failed", error);
}

export async function POST(request: Request) {
  return handle(request, async () => {
    const expected = process.env.ROOMOS_PIN_HASH;
    if (!expected || !process.env.ROOMOS_SESSION_SECRET) {
      throw new HttpError(500, "PIN is not configured on the server");
    }

    const body = await readJson(request, pinSchema);
    await requireActiveRoommate(body.roommateId);

    const ip = clientIp(request);
    if ((await recentFailures(ip)) >= MAX_FAILURES) {
      throw new HttpError(429, "Too many wrong PINs. Wait 15 minutes.");
    }

    if (!pinMatches(body.pin, expected)) {
      await recordAttempt(ip, false);
      throw new HttpError(401, "That PIN is not right");
    }

    await recordAttempt(ip, true);
    const response = jsonOk({ ok: true, roommateId: body.roommateId });
    response.cookies.set(SESSION_COOKIE, signSession(body.roommateId), sessionCookieOptions());
    return response;
  });
}
