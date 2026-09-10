"use client";

import { useEffect, useState } from "react";
import { ActivityRow } from "@/components/dashboard/ActivityRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { getDashboardData } from "@/lib/dashboard/getDashboardData.ts";
import type { ActivityEvent } from "@/lib/dashboard/summarize.ts";

export default function ActivityPage() {
  const { roommate, roommates } = useRoommate();
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roommate) return;
    void getDashboardData({ viewerId: roommate.id, roommates })
      .then((data) => setEvents(data.recentActivity))
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load activity");
        setEvents([]);
      });
  }, [roommate, roommates]);

  return (
    <div>
      <PageHeader title="Activity" subtitle="A running log of apartment changes." />
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
