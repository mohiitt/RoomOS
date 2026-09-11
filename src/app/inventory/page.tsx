"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { FloatingActionButton } from "@/components/layout/FloatingActionButton";
import { FoodTabs } from "@/components/inventory/FoodTabs";
import { InventoryCard } from "@/components/inventory/InventoryCard";
import { InventoryFilters } from "@/components/inventory/InventoryFilters";
import { RecipesList } from "@/components/recipes/RecipesList";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Input } from "@/components/ui/input";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import {
  filterInventoryItems,
  sortInventoryForUseSoon,
  type InventoryFilter,
} from "@/lib/inventory/filterItems";
import { listInventoryItems } from "@/lib/inventory/queries";
import { useRealtimeInventory } from "@/hooks/useRealtime.ts";
import { copy } from "@/lib/copy";
import type { InventoryItem } from "@/types/database";

const FILTERS = new Set<InventoryFilter>([
  "all",
  "shared",
  "mine",
  "fridge",
  "freezer",
  "pantry",
  "low",
  "expiring",
]);

export default function InventoryPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <InventoryPageContent />
    </Suspense>
  );
}

function InventoryPageContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "recipes" ? "recipes" : "fridge";
  const requested = searchParams.get("filter");
  const initialFilter = FILTERS.has(requested as InventoryFilter)
    ? (requested as InventoryFilter)
    : "all";

  const { roommate, roommates } = useRoommate();
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InventoryFilter>(initialFilter);

  const load = useCallback(() => {
    void listInventoryItems()
      .then(setItems)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load inventory");
        setItems([]);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtimeInventory(load);

  const visible = useMemo(
    () =>
      sortInventoryForUseSoon(
        filterInventoryItems(items ?? [], {
          query,
          filter,
          roommateId: roommate?.id ?? "",
        })
      ),
    [items, query, filter, roommate?.id]
  );

  return (
    <div>
      <PageHeader
        title="Food"
        subtitle={tab === "recipes" ? copy.recipesSubtitle : copy.foodSubtitle}
      />
      <FoodTabs tab={tab} />

      {tab === "recipes" ? (
        <>
          <Image
            src="/recipe-still.png"
            alt=""
            width={640}
            height={224}
            className="mb-4 h-28 w-full rounded-3xl object-cover"
          />
          <RecipesList />
          <FloatingActionButton href="/recipes/new" label="Add recipe" />
        </>
      ) : (
        <>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search items"
            aria-label="Search inventory"
            className="mb-3 min-h-12"
          />
          <InventoryFilters value={filter} onChange={setFilter} />
          {filter === "all" ? (
            <p className="mt-2 text-xs text-foreground/80">
              Use-soon items float to the top.
            </p>
          ) : null}

          <div className="mt-4 pb-16">
            {items === null ? (
              <LoadingSkeleton />
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : visible.length === 0 ? (
              <EmptyState
                title={copy.foodEmptyTitle}
                description={copy.foodEmptyBody}
                action={
                  <Link
                    href="/inventory/new"
                    className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    Add item
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3">
                {visible.map((item) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    owner={roommates.find((person) => person.id === item.owner_id)}
                  />
                ))}
              </div>
            )}
          </div>

          <FloatingActionButton href="/inventory/new" label="Add inventory item" />
        </>
      )}
    </div>
  );
}
