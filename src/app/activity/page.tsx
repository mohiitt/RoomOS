"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivityRow } from "@/components/dashboard/ActivityRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { getDashboardData } from "@/lib/dashboard/getDashboardData.ts";
import type { ActivityEvent } from "@/lib/dashboard/summarize.ts";
import { useRealtimeDashboard } from "@/hooks/useRealtime.ts";

export default function ActivityPage() {
  const { roommate, roommates } = useRoommate();
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!roommate) return;
    void getDashboardData({ viewerId: roommate.id, roommates })
      .then((next) => setEvents(next.recentActivity))
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load activity");
        setEvents([]);
      });
  }, [roommate, roommates]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtimeDashboard(load);

  return (
    <div>
      <PageHeader title="Activity" subtitle="Latest apartment changes." backHref="/" />
      {events === null ? (
        <LoadingSkeleton />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : events.length === 0 ? (
        <EmptyState
          title="Quiet for now."
          description="Activity shows up once roommates start using inventory, money, and chores."
        />
      ) : (
        <div className="grid gap-3 pb-8">
          {events.map((event) => (
            <ActivityRow key={event.id} event={event} roommates={roommates} />
          ))}
        </div>
      )}
    </div>
  );
}
