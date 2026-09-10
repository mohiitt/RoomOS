"use client";

import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { PinScreen } from "@/components/auth/PinScreen";
import { RoommateSelector } from "@/components/auth/RoommateSelector";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { Button } from "@/components/ui/button";
import { useApartmentRealtime } from "@/hooks/useRealtime.ts";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, error, roommates, verifyPin, selectRoommate, reload } =
    useRoommate();
  useApartmentRealtime(status === "ready");

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

  if (status === "pin") {
    return <PinScreen onSubmit={verifyPin} />;
  }

  if (status === "select") {
    return <RoommateSelector roommates={roommates} onSelect={selectRoommate} />;
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md pb-24">
      <div className="px-4 pt-6">{children}</div>
      <BottomNavigation />
    </div>
  );
}
