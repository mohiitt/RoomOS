"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { todayISO } from "@/lib/dates";
import { EXPENSE_CATEGORIES } from "@/lib/expenses/constants.ts";
import { formatMoney } from "@/lib/expenses/money.ts";
import {
  createRecurringExpense,
  generateDueRecurringExpenses,
  listRecurringExpenses,
  setRecurringActive,
} from "@/lib/expenses/queries.ts";
import { useRealtimeExpenses } from "@/hooks/useRealtime.ts";
import { calculateSplits } from "@/lib/expenses/validateSplit.ts";
import type { RecurringExpense, SplitType } from "@/types/database";

export default function RecurringPage() {
  const { roommate, roommates } = useRoommate();
  const [items, setItems] = useState<RecurringExpense[] | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("rent");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("monthly");
  const [paidBy, setPaidBy] = useState(roommate?.id ?? "");
  const [nextRunAt, setNextRunAt] = useState(todayISO());
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [selected, setSelected] = useState<string[]>([]);
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    setItems(await listRecurringExpenses());
  }

  const refresh = useCallback(() => {
    void load().catch((loadError: unknown) => {
      toast.error(loadError instanceof Error ? loadError.message : "Could not load recurring");
      setItems([]);
    });
  }, []);

  useEffect(() => {
    if (roommate && !paidBy) setPaidBy(roommate.id);
    if (selected.length === 0 && roommates.length > 0) {
      setSelected(roommates.map((person) => person.id));
    }
  }, [roommate, paidBy, roommates, selected.length]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useRealtimeExpenses(refresh);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!roommate) return;
    setBusy(true);
    try {
      const splits = calculateSplits({
        amount: Number(amount),
        splitType,
        participants: selected.map((roommateId) => ({
          roommateId,
          exactAmount: Number(exactAmounts[roommateId] || 0),
          shares: 1,
        })),
      });
      await createRecurringExpense({
        title: title.trim(),
        amount: Number(amount),
        paidBy,
        category,
        frequency,
        nextRunAt,
        splitType,
        splits:
          splitType === "equal" && selected.length === roommates.length ? [] : splits,
      });
      const generated = await generateDueRecurringExpenses();
      setTitle("");
      setAmount("");
      toast.success(generated ? `Saved · ${generated} posted` : "Saved");
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Recurring"
        subtitle="Rent, internet, utilities — posted automatically when due."
        backHref="/money"
      />
      <form onSubmit={(event) => void onCreate(event)} className="mb-8 grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-border">
        <div className="grid gap-2">
          <Label htmlFor="recurring-title">Title</Label>
          <Input
            id="recurring-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Rent"
            className="min-h-12"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="recurring-amount">Amount</Label>
            <Input
              id="recurring-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="min-h-12"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="recurring-frequency">Frequency</Label>
            <select
              id="recurring-frequency"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as "weekly" | "monthly")}
              className="min-h-12 rounded-lg border border-input bg-transparent px-3"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="recurring-category">Category</Label>
          <select
            id="recurring-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="min-h-12 rounded-lg border border-input bg-transparent px-3"
          >
            {EXPENSE_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="recurring-payer">Paid by</Label>
          <select
            id="recurring-payer"
            value={paidBy}
            onChange={(event) => setPaidBy(event.target.value)}
            className="min-h-12 rounded-lg border border-input bg-transparent px-3"
          >
            {roommates.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Split with</Label>
          <div className="flex flex-wrap gap-2">
            {roommates.map((person) => {
              const on = selected.includes(person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setSelected((current) =>
                      current.includes(person.id)
                        ? current.filter((id) => id !== person.id)
                        : [...current, person.id]
                    )
                  }
                  className={`min-h-11 rounded-full px-3 text-sm font-medium ring-2 ${
                    on
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-transparent text-foreground/70 ring-border"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {person.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="recurring-split">Split type</Label>
          <select
            id="recurring-split"
            value={splitType}
            onChange={(event) => setSplitType(event.target.value as SplitType)}
            className="min-h-12 rounded-lg border border-input bg-transparent px-3"
          >
            <option value="equal">Equal</option>
            <option value="exact">Exact amounts</option>
            <option value="shares">Shares</option>
          </select>
          <p className="text-xs text-foreground/80">
            Rent that is not even should use exact amounts.
          </p>
        </div>
        {splitType === "exact"
          ? selected.map((id) => {
              const person = roommates.find((roommate) => roommate.id === id);
              return (
                <div key={id} className="grid grid-cols-[1fr_7rem] items-center gap-3">
                  <Label htmlFor={`recurring-exact-${id}`}>{person?.name}</Label>
                  <Input
                    id={`recurring-exact-${id}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    className="min-h-11"
                    value={exactAmounts[id] ?? ""}
                    onChange={(event) =>
                      setExactAmounts((current) => ({ ...current, [id]: event.target.value }))
                    }
                  />
                </div>
              );
            })
          : null}
        <div className="grid gap-2">
          <Label htmlFor="recurring-next">Next date</Label>
          <Input
            id="recurring-next"
            type="date"
            value={nextRunAt}
            onChange={(event) => setNextRunAt(event.target.value)}
            className="min-h-12"
          />
        </div>
        <Button type="submit" size="lg" className="min-h-11" disabled={busy}>
          {busy ? "Saving…" : "Add recurring"}
        </Button>
      </form>

      {items === null ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="No recurring expenses."
          description="Add rent or internet once. RoomOS will post it when the date hits."
        />
      ) : (
        <ul className="grid gap-3 pb-8">
          {items.map((item) => (
            <li key={item.id} className="rounded-3xl bg-card p-4 ring-1 ring-border">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{item.title}</p>
                  <p className="text-sm text-foreground/80">
                    {formatMoney(item.amount)} · {item.frequency}
                    {item.split_type !== "equal" ? ` · ${item.split_type} split` : ""}
                    {" · next "}
                    {item.next_run_at}
                  </p>
                </div>
                <StatusBadge tone={item.is_active ? "good" : "neutral"}>
                  {item.is_active ? "Active" : "Paused"}
                </StatusBadge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="mt-3 min-h-11 w-full"
                onClick={() =>
                  void setRecurringActive(item.id, !item.is_active).then(load)
                }
              >
                {item.is_active ? "Pause" : "Resume"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
