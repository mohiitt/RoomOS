"use client";

import { useCallback, useEffect, useState } from "react";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { useRealtimeNotifications } from "@/hooks/useRealtime.ts";
import { countUnreadNotifications } from "@/lib/notifications/queries.ts";

export function useUnreadCount() {
  const { roommate } = useRoommate();
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    if (!roommate) {
      setCount(0);
      return;
    }
    void countUnreadNotifications(roommate.id)
      .then(setCount)
      .catch(() => setCount(0));
  }, [roommate]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtimeNotifications(load);

  return count;
}
