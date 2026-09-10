"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import {
  pushSupported,
  registerRoomosWorker,
  subscribeThisDevice,
  unsubscribeThisDevice,
} from "@/lib/push/browser.ts";

export function PushSettings() {
  const { roommate } = useRoommate();
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const supported = pushSupported();

  useEffect(() => {
    if (!supported) return;
    void registerRoomosWorker()
      .then(async (registration) => {
        const sub = await registration?.pushManager.getSubscription();
        setSubscribed(Boolean(sub));
      })
      .catch(() => undefined);
  }, [supported]);

  async function enable() {
    if (!roommate) return;
    setBusy(true);
    try {
      await subscribeThisDevice(roommate.id);
      setSubscribed(true);
      toast.success("Phone alerts are on");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enable alerts");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await unsubscribeThisDevice();
      setSubscribed(false);
      toast.success("Phone alerts are off");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disable alerts");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    if (!roommate) return;
    setBusy(true);
    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roommateId: roommate.id }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Could not send a test alert");
      toast.success("Test alert sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send a test alert");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        This browser cannot show lock-screen alerts. Install RoomOS on the phone’s home screen
        (iPhone: Safari → Share → Add to Home Screen).
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">
        {subscribed
          ? "This phone will get banners for expenses, chores, expiring food, and assigned issues."
          : "Allow alerts so this phone pings even when RoomOS is closed."}
      </p>
      {subscribed ? (
        <>
          <Button type="button" size="lg" className="min-h-11 w-full" disabled={busy} onClick={() => void test()}>
            Send a test alert
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11 w-full"
            disabled={busy}
            onClick={() => void disable()}
          >
            Turn off phone alerts
          </Button>
        </>
      ) : (
        <Button type="button" size="lg" className="min-h-11 w-full" disabled={busy} onClick={() => void enable()}>
          Allow phone alerts
        </Button>
      )}
    </div>
  );
}
