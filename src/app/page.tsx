"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ActivityRow } from "@/components/dashboard/ActivityRow";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { InventoryCard } from "@/components/inventory/InventoryCard";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import {
  getDashboardData,
  type DashboardData,
} from "@/lib/dashboard/getDashboardData.ts";
import { useRealtimeDashboard } from "@/hooks/useRealtime.ts";

function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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
        title={`${greeting()}, ${roommate?.name ?? ""}`}
        subtitle="What needs attention in the apartment."
      />

      {!roommate || (data === null && !error) ? (
        <LoadingSkeleton rows={4} />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : data ? (
        <div className="grid gap-5">
          {data.attention.length > 0 ? (
            <section className="grid gap-2">
              <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Your plate
              </h2>
              <ul className="grid gap-2">
                {data.attention.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="block rounded-2xl bg-card px-4 py-3 ring-1 ring-border"
                    >
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing needs you right now.</p>
          )}

          <div className="grid gap-3">
            <SummaryCard href="/money" label="Balance" title={data.moneyLabel} />
            <SummaryCard
              href="/inventory?filter=expiring"
              label="Food"
              title={data.foodLabel}
              detail="Open inventory to consume or restock."
            />
            <SummaryCard href="/chores" label="Chores" title={data.choreLabel} />
            <SummaryCard href="/shopping" label="Shopping" title={data.shoppingLabel} />
            <SummaryCard href="/issues" label="Apartment" title={data.issueLabel} />
          </div>

          {data.expiringItems.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Food to watch
              </h2>
              {data.expiringItems.map((item) => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  owner={roommates.find((person) => person.id === item.owner_id)}
                />
              ))}
            </section>
          ) : null}

          {data.lowStockItems.length > 0 &&
          data.lowStockItems.some(
            (item) => !data.expiringItems.some((expiring) => expiring.id === item.id)
          ) ? (
            <section className="grid gap-3">
              <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Low stock
              </h2>
              {data.lowStockItems
                .filter((item) => !data.expiringItems.some((expiring) => expiring.id === item.id))
                .map((item) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    owner={roommates.find((person) => person.id === item.owner_id)}
                  />
                ))}
            </section>
          ) : null}

          <section className="grid gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Recent activity
              </h2>
              <Link href="/activity" className="text-sm font-medium text-primary">
                See all
              </Link>
            </div>
            {data.recentActivity.length === 0 ? (
              <EmptyState
                title="Quiet for now."
                description="Activity shows up once roommates start using inventory, money, and chores."
              />
            ) : (
              data.recentActivity.slice(0, 8).map((event) => (
                <ActivityRow key={event.id} event={event} roommates={roommates} />
              ))
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
