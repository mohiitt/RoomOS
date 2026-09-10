import webpush from "web-push";
import { getAdminInsforge } from "@/lib/insforge/admin.ts";
import { describeError } from "@/lib/insforge/client.ts";
import { hrefForNotification, shouldSendPush } from "@/lib/notifications/createNotification.ts";
import type { ApartmentNotification, NotificationType } from "@/lib/notifications/types.ts";

type Raw = Record<string, unknown>;

function vapidConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function setVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }
  webpush.setVapidDetails(
    process.env.VAPID_MAILTO || "mailto:roomos@localhost",
    publicKey,
    privateKey
  );
}

function mapNotification(row: Raw): ApartmentNotification {
  return {
    id: String(row.id),
    roommate_id: String(row.roommate_id),
    type: row.type as NotificationType,
    title: String(row.title),
    message: String(row.message),
    entity_type: (row.entity_type as string | null) ?? null,
    entity_id: (row.entity_id as string | null) ?? null,
    is_read: Boolean(row.is_read),
    created_at: String(row.created_at),
  };
}

export async function savePushSubscription(input: {
  roommateId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}) {
  const client = getAdminInsforge();
  const { data: existing, error: findError } = await client.database
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", input.endpoint)
    .limit(1);

  if (findError) throw new Error(describeError(findError, "Could not save push subscription"));

  const row = {
    roommate_id: input.roommateId,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    user_agent: input.userAgent ?? null,
  };

  if (existing?.[0]) {
    const { error } = await client.database
      .from("push_subscriptions")
      .update(row)
      .eq("endpoint", input.endpoint);
    if (error) throw new Error(describeError(error, "Could not save push subscription"));
    return;
  }

  const { error } = await client.database.from("push_subscriptions").insert([row]);
  if (error) throw new Error(describeError(error, "Could not save push subscription"));
}

export async function deletePushSubscription(endpoint: string) {
  const { error } = await getAdminInsforge()
    .database.from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) throw new Error(describeError(error, "Could not remove push subscription"));
}

async function subscriptionsFor(roommateId: string) {
  const { data, error } = await getAdminInsforge()
    .database.from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("roommate_id", roommateId)
    .limit(20);
  if (error) throw new Error(describeError(error, "Could not load push subscriptions"));
  return (data ?? []) as { endpoint: string; p256dh: string; auth: string }[];
}

async function concernPriority(entityId: string | null) {
  if (!entityId) return null;
  const { data } = await getAdminInsforge()
    .database.from("concerns")
    .select("priority")
    .eq("id", entityId)
    .limit(1);
  const row = data?.[0] as { priority?: string } | undefined;
  return row?.priority ?? null;
}

async function sendToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url: string }
) {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload)
    );
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await deletePushSubscription(sub.endpoint).catch(() => undefined);
    }
  }
}

export async function sendTestPush(roommateId: string) {
  if (!vapidConfigured()) throw new Error("Push is not configured on the server");
  setVapid();
  const subs = await subscriptionsFor(roommateId);
  if (subs.length === 0) throw new Error("This phone is not subscribed yet");
  await Promise.all(
    subs.map((sub) =>
      sendToSubscription(sub, {
        title: "RoomOS",
        body: "Phone alerts are on for this roommate.",
        url: "/notifications",
      })
    )
  );
}

export async function dispatchPendingPush() {
  if (!vapidConfigured()) return { sent: 0, skipped: true as const };
  setVapid();

  const { data, error } = await getAdminInsforge().database.rpc("claim_push_notifications");
  if (error) throw new Error(describeError(error, "Could not claim push alerts"));

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const notifications = (rows as Raw[]).map(mapNotification);
  let sent = 0;

  for (const notification of notifications) {
    const priority =
      notification.type === "concern_created"
        ? await concernPriority(notification.entity_id)
        : null;
    if (!shouldSendPush(notification.type, priority)) continue;

    const subs = await subscriptionsFor(notification.roommate_id);
    await Promise.all(
      subs.map((sub) =>
        sendToSubscription(sub, {
          title: notification.title,
          body: notification.message,
          url: hrefForNotification(notification),
        })
      )
    );
    sent += subs.length;
  }

  return { sent, skipped: false as const };
}
