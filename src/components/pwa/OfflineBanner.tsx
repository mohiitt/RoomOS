"use client";

import { useOffline } from "next/offline";

export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div
      role="status"
      className="bg-foreground px-4 py-2 text-center text-sm text-background"
    >
      Offline. You can look around, but changes need a connection.
    </div>
  );
}
