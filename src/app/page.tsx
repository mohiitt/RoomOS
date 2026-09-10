"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivityRow } from "@/components/dashboard/ActivityRow";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ThemeSwitch } from "@/components/theme/ThemeToggle";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import {
  getDashboardData,
  type DashboardData,
} from "@/lib/dashboard/getDashboardData.ts";
import { useRealtimeDashboard } from "@/hooks/useRealtime.ts";
import { balanceAside, copy, foodAside, greeting } from "@/lib/copy";

export default function HomePage() {
  const { roommate, roommates } = useRoommate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!roommate) return;
    void getDashboardData({ viewerId: roommate.id, roommates })
      .then(setData)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load home");
        setData(null);
      });
  }, [roommate, roommates]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtimeDashboard(load);

  return (
    <div className="pb-8">
      <PageHeader
        title={`${greeting(new Date(), roommate?.name)}`}
        subtitle={copy.homeSubtitle}
        action={
          <div className="flex shrink-0 items-center gap-2">
            <ThemeSwitch />
            <NotificationBell />
          </div>
        }
      />

      {!roommate || (data === null && !error) ? (
        <LoadingSkeleton rows={4} />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : data ? (
        <div className="grid gap-5">
          <div className="grid gap-3">
            <SummaryCard
              href="/money"
              label="Balance"
              title={data.moneyLabel}
              detail={balanceAside(data.moneyNet)}
            />
            <SummaryCard
              href="/inventory"
              label="Food"
              title={data.foodLabel}
              detail={foodAside(data.expiringItems.length)}
              imageSrc="/food-bowl.png"
            />
            <SummaryCard
              href="/money"
              label="Money"
              title={data.latestExpenseLabel}
              detail={copy.moneyAside}
              imageSrc="/cash-split.png"
            />
          </div>

          <section className="grid gap-3">
            <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Recent activity
            </h2>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">{copy.activityEmpty}</p>
            ) : (
              data.recentActivity.slice(0, 3).map((event) => (
                <ActivityRow key={event.id} event={event} roommates={roommates} />
              ))
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
