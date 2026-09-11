import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, type SessionPayload } from "@/lib/auth/token";
import { apartmentCookieFrom } from "@/lib/auth/access";
import { describeError, publicErrorMessage } from "@/lib/insforge/errors";
import { OriginError, assertSameOrigin } from "@/lib/server/origin";
import { getAdminInsforge } from "@/lib/insforge/admin";
import type { Roommate } from "@/types/database";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function requestId() {
  return crypto.randomUUID();
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export async function routeId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    throw new HttpError(400, "That record was not found");
  }
  return id;
}

export async function requireSession(request: Request): Promise<SessionPayload> {
  const payload = verifySession(apartmentCookieFrom(request));
  if (!payload) {
    throw new HttpError(401, "Unlock RoomOS with the PIN first");
  }
  return payload;
}

export async function requireActiveRoommate(roommateId: string): Promise<Roommate> {
  const { data, error } = await getAdminInsforge()
    .database.from("roommates")
    .select("id, name, avatar_url, is_active, created_at")
    .eq("id", roommateId)
    .eq("is_active", true)
    .limit(1);

  if (error) throw new Error(describeError(error, "Could not load roommate"));
  const row = data?.[0] as Roommate | undefined;
  if (!row) throw new HttpError(403, "That roommate is not active");
  return row;
}

export async function listActiveRoommates(): Promise<Roommate[]> {
  const { data, error } = await getAdminInsforge()
    .database.from("roommates")
    .select("id, name, avatar_url, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) throw new Error(describeError(error, "Could not load roommates"));
  return (data ?? []) as Roommate[];
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HttpError(400, issue?.message || "Check that form and try again");
  }
  return parsed.data;
}

export function jsonOk(data: unknown, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(data, init);
}

export function jsonError(error: unknown, fallback = "Something went wrong") {
  if (error instanceof HttpError || error instanceof OriginError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[roomos]", publicErrorMessage(error, fallback), error);
  return NextResponse.json({ error: publicErrorMessage(error, fallback) }, { status: 500 });
}

export async function handle(
  request: Request,
  work: () => Promise<Response>,
  options?: { origin?: boolean }
) {
  const id = request.headers.get("x-request-id") || requestId();
  try {
    if (options?.origin !== false) assertSameOrigin(request);
    const response = await work();
    response.headers.set("x-request-id", id);
    return response;
  } catch (error) {
    const response = jsonError(error);
    response.headers.set("x-request-id", id);
    return response;
  }
}
