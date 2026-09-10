"use client";

import { useEffect, useRef } from "react";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { PinScreen } from "@/components/auth/PinScreen";
import { RoommateSelector } from "@/components/auth/RoommateSelector";
import { PwaRoot } from "@/components/pwa/PwaRoot";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { Button } from "@/components/ui/button";
import { useApartmentRealtime, useRealtimeNotifications } from "@/hooks/useRealtime.ts";
import { generateTimeNotifications } from "@/lib/notifications/queries.ts";

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    status,
    error,
    roommate,
    roommates,
    verifyPin,
    selectRoommate,
    switchRoommate,
    reload,
  } = useRoommate();
  const statusRef = useRef(status);
  statusRef.current = status;
  useApartmentRealtime(status === "ready");

  useEffect(() => {
    if (status !== "ready") return;
    void generateTimeNotifications()
      .then(() => fetch("/api/push/dispatch", { method: "POST" }))
      .catch(() => undefined);
  }, [status]);
  useRealtimeNotifications(() => {
    if (statusRef.current !== "ready") return;
    void fetch("/api/push/dispatch", { method: "POST" }).catch(() => undefined);
  });

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">Opening RoomOS…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-medium">Could not load RoomOS</p>
        <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
        <Button size="lg" className="min-h-11" onClick={() => void reload()}>
          Try again
        </Button>
      </div>
    );
  }

  if (status === "select") {
    return <RoommateSelector roommates={roommates} onSelect={selectRoommate} />;
  }

  if (status === "pin") {
    return (
      <PinScreen
        roommateName={roommate?.name ?? null}
        onSubmit={verifyPin}
        onNotYou={switchRoommate}
      />
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md pb-24">
      <PwaRoot />
      <div className="px-4 pt-6">{children}</div>
      <BottomNavigation />
    </div>
  );
}
