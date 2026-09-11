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

function adminClient(apiKey: string) {
  return createAdminClient({
    baseUrl: Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("OSS_URL") || "",
    apiKey,
  });
}

async function ack(client: ReturnType<typeof adminClient>, id: string, errorMessage?: string) {
  await client.database.rpc("ack_push_notification", {
    p_id: id,
    p_error: errorMessage ?? null,
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

  const client = adminClient(expected);

  await client.database.rpc("generate_due_recurring_expenses");
  await client.database.rpc("generate_due_chore_assignments");
  await client.database.rpc("generate_time_notifications");

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) {
    return json({ sent: 0, skipped: "vapid" });
  }

  webpush.setVapidDetails(Deno.env.get("VAPID_MAILTO") || "mailto:roomos@localhost", publicKey, privateKey);

  const { data, error } = await client.database.rpc("claim_push_notifications");
  if (error) return json({ error: error.message }, 500);

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  let sent = 0;

  for (const row of rows as Array<Record<string, unknown>>) {
    const id = String(row.id ?? "");
    const type = String(row.type ?? "");
    if (!id) continue;

    if (!PUSH_TYPES.has(type)) {
      await ack(client, id);
      continue;
    }

    if (type === "concern_created") {
      const { data: concerns } = await client.database
        .from("concerns")
        .select("priority")
        .eq("id", String(row.entity_id ?? ""))
        .limit(1);
      const priority = (concerns?.[0] as { priority?: string } | undefined)?.priority;
      if (priority !== "high" && priority !== "urgent") {
        await ack(client, id);
        continue;
      }
    }

    const { data: subs } = await client.database
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("roommate_id", String(row.roommate_id))
      .limit(20);

    try {
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
        } catch (pushError) {
          const status = (pushError as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await client.database.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      }
      await ack(client, id);
    } catch (sendError) {
      await ack(client, id, sendError instanceof Error ? sendError.message : "push failed");
    }
  }

  return json({ sent });
}
