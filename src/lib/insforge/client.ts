import { createClient } from "@insforge/sdk";

let client: ReturnType<typeof createClient> | null = null;

export function getInsforge() {
  if (client) return client;

  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

  if (!baseUrl || !anonKey) {
    throw new Error("InsForge environment variables are missing.");
  }

  client = createClient({ baseUrl, anonKey });
  return client;
}

export function describeError(error: unknown, fallback = "Something went wrong") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}
