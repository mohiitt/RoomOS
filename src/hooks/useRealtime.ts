"use client";

import { useEffect } from "react";
import { startApartmentRealtime, subscribeApartmentChanges } from "@/lib/realtime/apartment.ts";
import { changeMatchesTables } from "@/lib/realtime/tables.ts";
import type { RoomosChange } from "@/lib/realtime/tables.ts";
import {
  CHORE_TABLES,
  CONCERN_TABLES,
  INVENTORY_TABLES,
  MONEY_TABLES,
  NOTIFICATION_TABLES,
  RECIPE_TABLES,
  SHOPPING_TABLES,
} from "@/lib/realtime/tables.ts";

function debounce(run: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const wrapped = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, ms);
  };
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
  };
  return wrapped;
}

export function useApartmentRealtime(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    void startApartmentRealtime().catch(() => undefined);
  }, [enabled]);
}

function useRealtimeTables(
  tables: readonly string[] | "all",
  onChange: () => void
) {
  const watched = tables === "all" ? "all" : tables.join(",");
  useEffect(() => {
    const reload = debounce(onChange, 250);
    const unsubscribe = subscribeApartmentChanges((change: RoomosChange) => {
      if (changeMatchesTables(change, watched === "all" ? "all" : watched.split(","))) {
        reload();
      }
    });
    return () => {
      reload.cancel();
      unsubscribe();
    };
  }, [onChange, watched]);
}

export function useRealtimeInventory(onChange: () => void) {
  useRealtimeTables(INVENTORY_TABLES, onChange);
}

export function useRealtimeShopping(onChange: () => void) {
  useRealtimeTables(SHOPPING_TABLES, onChange);
}

export function useRealtimeExpenses(onChange: () => void) {
  useRealtimeTables(MONEY_TABLES, onChange);
}

export function useRealtimeChores(onChange: () => void) {
  useRealtimeTables(CHORE_TABLES, onChange);
}

export function useRealtimeConcerns(onChange: () => void) {
  useRealtimeTables(CONCERN_TABLES, onChange);
}

export function useRealtimeDashboard(onChange: () => void) {
  useRealtimeTables("all", onChange);
}

export function useRealtimeRecipes(onChange: () => void) {
  useRealtimeTables(RECIPE_TABLES, onChange);
}

export function useRealtimeNotifications(onChange: () => void) {
  useRealtimeTables(NOTIFICATION_TABLES, onChange);
}
