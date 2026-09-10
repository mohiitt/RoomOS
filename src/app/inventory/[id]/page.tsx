"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuantityDialog } from "@/components/inventory/QuantityDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { formatShortDate } from "@/lib/dates";
import { getExpiryStatus } from "@/lib/inventory/checkExpiry";
import { isLowStock } from "@/lib/inventory/checkLowStock";
import { labelForCategory, labelForLocation } from "@/lib/inventory/constants";
import { formatQuantity } from "@/lib/inventory/format";
import {
  deleteInventoryItem,
  getInventoryItem,
  listItemTransactions,
} from "@/lib/inventory/queries";
import {
  addInventoryStock,
  consumeInventory,
} from "@/lib/inventory/updateQuantity";
import type { InventoryItem, InventoryTransaction } from "@/types/database";

export default function InventoryItemPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { roommate, roommates } = useRoommate();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [history, setHistory] = useState<InventoryTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"consume" | "add" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [nextItem, nextHistory] = await Promise.all([
        getInventoryItem(params.id),
        listItemTransactions(params.id),
      ]);
      setItem(nextItem);
      setHistory(nextHistory);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load item");
    }
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  const owner = roommates.find((person) => person.id === item?.owner_id);
  const expiry = item ? getExpiryStatus(item.expiry_date) : "none";

  async function onConsume(amount: number) {
    if (!item || !roommate) return;
    setBusy(true);
    try {
      const updated = await consumeInventory(item, amount, roommate.id);
      setItem(updated);
      setHistory(await listItemTransactions(item.id));
      setDialog(null);
      toast.success(
        isLowStock(updated.quantity, updated.minimum_quantity) &&
          updated.auto_add_to_shopping
          ? "Consumed · added to shopping"
          : "Consumed"
      );
    } catch (consumeError) {
      toast.error(consumeError instanceof Error ? consumeError.message : "Could not consume");
    } finally {
      setBusy(false);
    }
  }

  async function onAdd(amount: number) {
    if (!item || !roommate) return;
    setBusy(true);
    try {
      const updated = await addInventoryStock(item, amount, roommate.id);
      setItem(updated);
      setHistory(await listItemTransactions(item.id));
      setDialog(null);
      toast.success("Stock added");
    } catch (addError) {
      toast.error(addError instanceof Error ? addError.message : "Could not add stock");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!item) return;
    setBusy(true);
    try {
      await deleteInventoryItem(item.id);
      toast.success("Item deleted");
      router.push("/inventory");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Could not delete");
      setBusy(false);
    }
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!item) {
    return <LoadingSkeleton rows={3} />;
  }

  return (
    <div className="pb-8">
      <PageHeader title={item.name} subtitle={labelForCategory(item.category)} />
      <section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
        <p className="font-heading text-4xl">{formatQuantity(item.quantity, item.unit)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge>
            {item.ownership_type === "personal" ? owner?.name ?? "Personal" : "Shared"}
          </StatusBadge>
          <StatusBadge tone="info">{labelForLocation(item.storage_location)}</StatusBadge>
          {isLowStock(item.quantity, item.minimum_quantity) ? (
            <StatusBadge tone="warn">Low stock</StatusBadge>
          ) : null}
          {expiry === "expired" ? <StatusBadge tone="bad">Expired</StatusBadge> : null}
          {expiry === "critical" || expiry === "soon" ? (
            <StatusBadge tone="warn">
              Expires {item.expiry_date ? formatShortDate(item.expiry_date) : ""}
            </StatusBadge>
          ) : null}
        </div>
        {item.expiry_date && expiry === "normal" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Expires {formatShortDate(item.expiry_date)}
          </p>
        ) : null}
        {item.minimum_quantity !== null ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Minimum: {formatQuantity(item.minimum_quantity, item.unit)}
          </p>
        ) : null}
        {item.notes ? <p className="mt-3 text-sm">{item.notes}</p> : null}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button
          type="button"
          size="lg"
          className="min-h-12"
          onClick={() => setDialog("consume")}
        >
          Consume
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="min-h-12"
          onClick={() => setDialog("add")}
        >
          Add stock
        </Button>
      </div>

      <div className="mt-4 flex gap-3">
        <Link
          href={`/inventory/${item.id}/edit`}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground"
        >
          Edit
        </Link>
        <Button
          type="button"
          variant="destructive"
          size="lg"
          className="min-h-11 flex-1"
          onClick={() => setConfirmDelete(true)}
        >
          Delete
        </Button>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium tracking-[0.16em] text-muted-foreground uppercase">
          History
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No movements yet.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {history.map((entry) => {
              const actor = roommates.find((person) => person.id === entry.roommate_id);
              return (
                <li
                  key={entry.id}
                  className="rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-border"
                >
                  <p className="font-medium capitalize">{entry.transaction_type}</p>
                  <p className="text-muted-foreground">
                    {formatQuantity(entry.quantity_before, item.unit)} →{" "}
                    {formatQuantity(entry.quantity_after, item.unit)}
                    {actor ? ` · ${actor.name}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <QuantityDialog
        open={dialog === "consume"}
        title="Consume"
        description={`How much ${item.name} did you use?`}
        unit={item.unit}
        max={item.quantity}
        confirmLabel="Consume"
        busy={busy}
        onOpenChange={(open) => setDialog(open ? "consume" : null)}
        onConfirm={onConsume}
      />
      <QuantityDialog
        open={dialog === "add"}
        title="Add stock"
        description={`How much ${item.name} are you adding?`}
        unit={item.unit}
        confirmLabel="Add"
        busy={busy}
        onOpenChange={(open) => setDialog(open ? "add" : null)}
        onConfirm={onAdd}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this item?"
        description="This also removes its quantity history."
        confirmLabel="Delete"
        busy={busy}
        onOpenChange={setConfirmDelete}
        onConfirm={() => void onDelete()}
      />
    </div>
  );
}
