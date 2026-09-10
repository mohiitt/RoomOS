import { createAdminClient } from "npm:@insforge/sdk";
import webpush from "npm:web-push";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const PUSH_TYPES = new Set([
  "expense_added",
  "inventory_expiring",
  "chore_due",
  "chore_assigned",
  "concern_created",
  "concern_assigned",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("API_KEY") || Deno.env.get("PUSH_DISPATCH_SECRET");
  const auth = req.headers.get("Authorization") ?? "";
  if (!expected || auth !== `Bearer ${expected}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) return json({ error: "VAPID keys missing" }, 500);

  webpush.setVapidDetails(Deno.env.get("VAPID_MAILTO") || "mailto:roomos@localhost", publicKey, privateKey);

  const client = createAdminClient({
    baseUrl: Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("OSS_URL") || "",
    apiKey: expected,
  });

  await client.database.rpc("generate_time_notifications");
  const { data, error } = await client.database.rpc("claim_push_notifications");
  if (error) return json({ error: error.message }, 500);

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  let sent = 0;

  for (const row of rows as Array<Record<string, unknown>>) {
    const type = String(row.type ?? "");
    if (!PUSH_TYPES.has(type)) continue;
    if (type === "concern_created") {
      const { data: concerns } = await client.database
        .from("concerns")
        .select("priority")
        .eq("id", String(row.entity_id ?? ""))
        .limit(1);
      const priority = (concerns?.[0] as { priority?: string } | undefined)?.priority;
      if (priority !== "high" && priority !== "urgent") continue;
    }

    const { data: subs } = await client.database
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("roommate_id", String(row.roommate_id))
      .limit(20);

    for (const sub of (subs ?? []) as Array<{ endpoint: string; p256dh: string; auth: string }>) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: String(row.title ?? "RoomOS"),
            body: String(row.message ?? ""),
            url: "/notifications",
          })
        );
        sent += 1;
      } catch {
        /* stale subscriptions are cleaned when a roommate next opens Settings */
      }
    }
  }

  return json({ sent });
}
