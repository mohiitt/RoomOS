"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityRow } from "@/components/dashboard/ActivityRow";
import { StatTile } from "@/components/dashboard/StatTile";
import { StreakFlame } from "@/components/dashboard/StreakFlame";
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
import { greeting } from "@/lib/copy";

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
        subtitle={data ? `Apartment vibe: ${data.vibe.mood}. ${data.vibe.line}` : undefined}
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
          {data.attention.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Needs attention
              </h2>
              {data.attention.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="rounded-2xl bg-primary/8 px-4 py-3 shadow-sm ring-1 ring-primary/25"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-foreground/80">{item.detail}</p>
                </Link>
              ))}
            </section>
          ) : null}

          <section className="grid grid-cols-2 gap-3">
            <StatTile
              href="/money"
              label="Balance"
              value={data.errors.money ?? data.moneyStat}
              tone={data.moneyNet !== 0 ? "warn" : "default"}
            />
            <StatTile
              href="/inventory"
              label="Food"
              value={data.errors.inventory ?? data.foodStat}
              tone={data.expiringItems.length > 0 ? "warn" : "default"}
            />
            <StatTile href="/shopping" label="Shopping" value={data.errors.shopping ?? data.shoppingStat} />
            <StatTile href="/chores" label="Chores" value={data.errors.chores ?? data.choreStat} />
            <StatTile href="/issues" label="Issues" value={data.errors.issues ?? data.issueStat} />
            <Link
              href="/chores"
              className="rounded-2xl bg-card px-4 py-3 shadow-sm ring-1 ring-border/80"
            >
              <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Your streak
              </p>
              <div className="mt-1">
                <StreakFlame
                  weeks={data.streak.weeks}
                  label={data.streak.label}
                  shrugging={data.streak.shrugging}
                />
              </div>
            </Link>
          </section>

          {data.roommateOfWeek ? (
            <section className="rounded-2xl bg-card px-4 py-3 shadow-sm ring-1 ring-border/80">
              <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Roommate of the week
              </p>
              <p className="mt-1 font-heading text-xl leading-tight">
                {data.roommateOfWeek.name}
              </p>
              <p className="text-sm text-foreground/80">
                {data.roommateOfWeek.points} points this cycle. The sponge is proud.
              </p>
            </section>
          ) : null}

          <section className="grid gap-3">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Recent activity
              </h2>
              <Link href="/activity" className="text-sm font-medium text-primary">
                View all
              </Link>
            </div>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-foreground/80">Quiet. Too quiet. Someone should cook.</p>
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
