"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { FloatingActionButton } from "@/components/layout/FloatingActionButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { QuantityDialog } from "@/components/inventory/QuantityDialog";
import { ShoppingForm } from "@/components/shopping/ShoppingForm";
import { ShoppingItemCard } from "@/components/shopping/ShoppingItemCard";
import { Button } from "@/components/ui/button";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import {
  createShoppingItem,
  listShoppingItems,
  purchaseShoppingItem,
  removeShoppingItem,
} from "@/lib/shopping/queries";
import type { ShoppingInput } from "@/lib/shopping/schema";
import type { ShoppingItem, ShoppingStatus } from "@/types/database";
import { useRealtimeShopping } from "@/hooks/useRealtime.ts";

export default function ShoppingPage() {
  const { roommate, roommates } = useRoommate();
  const [tab, setTab] = useState<Extract<ShoppingStatus, "needed" | "purchased">>(
    "needed"
  );
  const [items, setItems] = useState<ShoppingItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [purchaseItem, setPurchaseItem] = useState<ShoppingItem | null>(null);

  const load = useCallback(async (status = tab) => {
    try {
      setError(null);
      setItems(await listShoppingItems(status));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load list");
      setItems([]);
    }
  }, [tab]);

  const refresh = useCallback(() => {
    void load(tab);
  }, [load, tab]);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);
  useRealtimeShopping(refresh);

  async function onAdd(values: ShoppingInput) {
    if (!roommate) return;
    setBusy(true);
    try {
      await createShoppingItem({
        name: values.name,
        requested_quantity: values.requested_quantity,
        unit: values.unit,
        reason: "manual",
        added_by: roommate.id,
      });
      setAdding(false);
      toast.success("Added to the list");
      if (tab !== "needed") setTab("needed");
      else await load("needed");
    } finally {
      setBusy(false);
    }
  }

  async function onPurchase(amount: number) {
    if (!roommate || !purchaseItem) return;
    setBusy(true);
    try {
      await purchaseShoppingItem({
        shoppingId: purchaseItem.id,
        roommateId: roommate.id,
        quantity: amount,
      });
      setPurchaseItem(null);
      toast.success(
        purchaseItem.inventory_item_id
          ? "Purchased · inventory updated"
          : "Purchased"
      );
      await load(tab);
    } catch (purchaseError) {
      toast.error(
        purchaseError instanceof Error ? purchaseError.message : "Could not purchase"
      );
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(item: ShoppingItem) {
    setBusy(true);
    try {
      await removeShoppingItem(item.id);
      toast.success("Removed");
      await load(tab);
    } catch (removeError) {
      toast.error(removeError instanceof Error ? removeError.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Shopping" subtitle="What we need to pick up." />

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={tab === "needed" ? "default" : "outline"}
          size="lg"
          className="min-h-11"
          onClick={() => setTab("needed")}
        >
          Needed
        </Button>
        <Button
          type="button"
          variant={tab === "purchased" ? "default" : "outline"}
          size="lg"
          className="min-h-11"
          onClick={() => setTab("purchased")}
        >
          Purchased
        </Button>
      </div>

      {adding ? (
        <div className="mb-5 rounded-3xl bg-card p-4 ring-1 ring-border">
          <ShoppingForm busy={busy} onSubmit={onAdd} />
        </div>
      ) : null}

      {items === null ? (
        <LoadingSkeleton />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : items.length === 0 ? (
        <EmptyState
          title={tab === "needed" ? "Nothing to buy." : "No purchases yet."}
          description={
            tab === "needed"
              ? "Add something manually, or consume inventory until it hits the low-stock line."
              : "Bought items will show up here."
          }
        />
      ) : (
        <div className="grid gap-3 pb-16">
          {items.map((item) => (
            <ShoppingItemCard
              key={item.id}
              item={item}
              roommates={roommates}
              onPurchase={setPurchaseItem}
              onRemove={(row) => void onRemove(row)}
            />
          ))}
        </div>
      )}

      <FloatingActionButton
        label="Add shopping item"
        onClick={() => setAdding((open) => !open)}
      />

      <QuantityDialog
        open={purchaseItem !== null}
        title="Mark purchased"
        description={
          purchaseItem?.inventory_item_id
            ? `How much ${purchaseItem.name} did you buy? This restocks inventory.`
            : `How much ${purchaseItem?.name ?? "this"} did you buy?`
        }
        unit={purchaseItem?.unit ?? "count"}
        defaultAmount={purchaseItem?.requested_quantity ?? 1}
        confirmLabel="Purchased"
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setPurchaseItem(null);
        }}
        onConfirm={onPurchase}
      />
    </div>
  );
}
