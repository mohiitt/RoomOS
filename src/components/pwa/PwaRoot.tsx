"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { pushSupported, registerRoomosWorker, subscribeThisDevice } from "@/lib/push/browser.ts";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

export function PwaRoot() {
  const { roommate } = useRoommate();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [showPushNudge, setShowPushNudge] = useState(false);

  useEffect(() => {
    void registerRoomosWorker().catch(() => undefined);

    const dismissed = localStorage.getItem("roomos_install_dismissed") === "true";
    setIosHint(isIos() && !isStandalone() && !dismissed);
    setShowInstall(false);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  useEffect(() => {
    if (!roommate || !pushSupported()) return;
    if (localStorage.getItem("roomos_push_nudge_dismissed") === "true") return;
    if (Notification.permission !== "default") return;
    setShowPushNudge(true);
  }, [roommate]);

  async function onInstall() {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
    }
    localStorage.setItem("roomos_install_dismissed", "true");
    setShowInstall(false);
    setIosHint(false);
  }

  function dismissInstall() {
    localStorage.setItem("roomos_install_dismissed", "true");
    setShowInstall(false);
    setIosHint(false);
  }

  async function enablePush() {
    if (!roommate) return;
    try {
      await subscribeThisDevice(roommate.id);
      localStorage.setItem("roomos_push_nudge_dismissed", "true");
      setShowPushNudge(false);
      toast.success("Phone alerts are on");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enable alerts");
    }
  }

  return (
    <div className="grid gap-2 px-4 pt-3">
      {(showInstall || iosHint) && (
        <div className="rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-border">
          <p className="font-medium">Install RoomOS on this phone</p>
          {iosHint ? (
            <p className="mt-1 text-muted-foreground">
              Tap Share, then Add to Home Screen. Open it from that icon for lock-screen alerts.
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">
              Add it to the home screen so it opens like the other apps.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {iosHint ? null : (
              <Button type="button" size="lg" className="min-h-11" onClick={() => void onInstall()}>
                Install
              </Button>
            )}
            <Button type="button" variant="ghost" size="lg" className="min-h-11" onClick={dismissInstall}>
              Not now
            </Button>
          </div>
        </div>
      )}
      {showPushNudge ? (
        <div className="rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-border">
          <p className="font-medium">Turn on phone alerts</p>
          <p className="mt-1 text-muted-foreground">
            Get a banner when someone logs an expense, a chore is due, or food is about to expire.
          </p>
          <div className="mt-3 flex gap-2">
            <Button type="button" size="lg" className="min-h-11" onClick={() => void enablePush()}>
              Allow alerts
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="min-h-11"
              onClick={() => {
                localStorage.setItem("roomos_push_nudge_dismissed", "true");
                setShowPushNudge(false);
              }}
            >
              Not now
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
