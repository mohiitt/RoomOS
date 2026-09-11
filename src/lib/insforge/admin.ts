import "server-only";
import { createAdminClient } from "@insforge/sdk";

let admin: ReturnType<typeof createAdminClient> | null = null;

export function getAdminInsforge() {
  if (admin) return admin;
  const baseUrl = process.env.INSFORGE_URL || process.env.NEXT_PUBLIC_INSFORGE_URL;
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("InsForge admin credentials are missing.");
  }
  admin = createAdminClient({ baseUrl, apiKey });
  return admin;
}
