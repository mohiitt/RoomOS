import { getInsforge } from "@/lib/insforge/client";
import {
  ROOMOS_CHANNEL,
  ROOMOS_EVENT,
  type RoomosChange,
} from "@/lib/realtime/tables.ts";

type Handler = (change: RoomosChange) => void;

const handlers = new Set<Handler>();
let startPromise: Promise<void> | null = null;
let listening = false;

function emit(payload: Record<string, unknown>) {
  const table = typeof payload.table === "string" ? payload.table : "";
  if (!table) return;
  const change: RoomosChange = {
    table,
    op: typeof payload.op === "string" ? payload.op : "",
    id: typeof payload.id === "string" ? payload.id : undefined,
  };
  for (const handler of handlers) handler(change);
}

async function connectAndSubscribe() {
  const client = getInsforge();
  await client.realtime.connect();
  const response = await client.realtime.subscribe(ROOMOS_CHANNEL);
  if (!response.ok) {
    throw new Error(response.error?.message ?? "Could not subscribe to apartment updates");
  }
  if (!listening) {
    client.realtime.on(ROOMOS_EVENT, emit);
    client.realtime.on("connect", () => {
      void client.realtime.subscribe(ROOMOS_CHANNEL);
    });
    listening = true;
  }
}

export function startApartmentRealtime(): Promise<void> {
  if (!startPromise) {
    startPromise = connectAndSubscribe().catch((error) => {
      startPromise = null;
      throw error;
    });
  }
  return startPromise;
}

export function subscribeApartmentChanges(handler: Handler): () => void {
  handlers.add(handler);
  void startApartmentRealtime().catch(() => {
    /* Screens still work; the other roommate will need a refresh. */
  });
  return () => {
    handlers.delete(handler);
  };
}
