import { createClient } from "@insforge/sdk";
import { describeError } from "./errors.ts";

export { describeError };

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
