"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const loadId = useRef(0);

  const load = useCallback(() => {
    if (!roommate) return;
    const requestId = ++loadId.current;
    void getDashboardData({ viewerId: roommate.id, roommates })
      .then((next) => {
        if (requestId !== loadId.current) return;
        setError(null);
        setData(next);
      })
      .catch((loadError: unknown) => {
        if (requestId !== loadId.current) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load home");
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
              detail={data.errors.money ?? balanceAside(data.moneyNet)}
            />
            <SummaryCard
              href="/inventory"
              label="Food"
              title={data.foodLabel}
              detail={data.errors.inventory ?? foodAside(data.expiringItems.length)}
              imageSrc="/food-bowl.png"
            />
            <SummaryCard
              href="/shopping"
              label="Shopping"
              title={data.shoppingLabel}
              detail={data.errors.shopping ?? `${data.shoppingCount} on the list`}
            />
            <SummaryCard
              href="/chores"
              label="Chores"
              title={data.choreLabel}
              detail={data.errors.chores ?? (data.yourChores[0]?.template?.name ?? "This week's rotation")}
            />
            <SummaryCard
              href="/issues"
              label="Issues"
              title={data.issueLabel}
              detail={data.errors.issues ?? (data.yourIssues[0]?.title ?? "Nothing assigned to you")}
            />
            <SummaryCard
              href="/money"
              label="Money"
              title={data.latestExpenseLabel}
              detail={data.errors.money ?? copy.moneyAside}
              imageSrc="/cash-split.png"
            />
          </div>

          {data.attention.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Needs attention
              </h2>
              {data.attention.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="rounded-2xl bg-card px-4 py-3 shadow-sm ring-1 ring-border/80"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </Link>
              ))}
            </section>
          ) : null}

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
