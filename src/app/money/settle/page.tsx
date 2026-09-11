"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/expenses/money.ts";
import {
  createSettlement,
  listBalances,
  listSettlementPage,
} from "@/lib/expenses/queries.ts";
import { moneyViewFromNets } from "@/lib/expenses/view.ts";
import { useRealtimeExpenses } from "@/hooks/useRealtime.ts";
import type { Settlement } from "@/types/database";

export default function SettlePage() {
  const router = useRouter();
  const { roommate, roommates } = useRoommate();
  const [settlements, setSettlements] = useState<Settlement[] | null>(null);
  const [debts, setDebts] = useState<{ fromId: string; toId: string; amount: number }[]>([]);
  const [payerId, setPayerId] = useState(roommate?.id ?? "");
  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roommate && !payerId) setPayerId(roommate.id);
  }, [roommate, payerId]);

  const refresh = useCallback(
    async (seedForm = false) => {
      try {
        const [nextNets, page] = await Promise.all([
          listBalances(),
          listSettlementPage(0, 20),
        ]);
        const view = moneyViewFromNets(
          roommates.map((person) => ({
            roommateId: person.id,
            net: nextNets.find((row) => row.roommateId === person.id)?.net ?? 0,
          })),
          roommate?.id ?? ""
        );
        setDebts(view.debts);
        setSettlements(page.items);
        if (seedForm) {
          const firstOwed = view.debts.find((debt) => debt.fromId === roommate?.id);
          if (firstOwed) {
            setReceiverId(firstOwed.toId);
            setAmount(String(firstOwed.amount));
          }
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load balances");
        setSettlements([]);
      }
    },
    [roommate, roommates]
  );

  const onRealtime = useCallback(() => {
    void refresh(false);
  }, [refresh]);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);
  useRealtimeExpenses(onRealtime);

  const nameFor = (id: string) =>
    roommates.find((person) => person.id === id)?.name ?? "Roommate";

  const suggested = useMemo(
    () => debts.find((debt) => debt.fromId === payerId && debt.toId === receiverId),
    [debts, payerId, receiverId]
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!roommate) return;
    setBusy(true);
    try {
      await createSettlement({
        payerId,
        receiverId,
        amount: Number(amount),
        note: note.trim() || null,
        createdBy: roommate.id,
      });
      toast.success("Settlement recorded");
      router.push("/money");
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Could not settle");
    } finally {
      setBusy(false);
    }
  }

  if (settlements === null) return <LoadingSkeleton rows={3} />;

  return (
    <div>
      <PageHeader title="Settle up" subtitle="Record a payment between roommates." backHref="/money" />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      <form onSubmit={(event) => void onSubmit(event)} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="payer">Payer</Label>
          <select
            id="payer"
            value={payerId}
            onChange={(event) => setPayerId(event.target.value)}
            className="min-h-12 rounded-lg border border-input bg-transparent px-3 text-base"
          >
            {roommates.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="receiver">Receiver</Label>
          <select
            id="receiver"
            value={receiverId}
            onChange={(event) => setReceiverId(event.target.value)}
            className="min-h-12 rounded-lg border border-input bg-transparent px-3 text-base"
          >
            <option value="">Choose roommate</option>
            {roommates
              .filter((person) => person.id !== payerId)
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="settle-amount">Amount</Label>
          <Input
            id="settle-amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="min-h-12 text-base"
            required
          />
          {suggested ? (
            <p className="text-xs text-muted-foreground">
              Suggested: {formatMoney(suggested.amount)}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="settle-note">Note</Label>
          <Input
            id="settle-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Venmo, cash, Zelle…"
            className="min-h-12 text-base"
          />
        </div>
        <Button type="submit" size="lg" className="min-h-12" disabled={busy}>
          {busy ? "Saving…" : "Record payment"}
        </Button>
      </form>

      <h2 className="mt-8 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        History
      </h2>
      {settlements.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No settlements yet." description="Payments between roommates will show here." />
        </div>
      ) : (
        <ul className="mt-3 grid gap-2 pb-8">
          {settlements.map((item) => (
            <li key={item.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
              <p className="font-medium">
                {nameFor(item.payer_id)} paid {nameFor(item.receiver_id)} {formatMoney(item.amount)}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatShortDate(item.settled_at.slice(0, 10))}
                {item.note ? ` · ${item.note}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
