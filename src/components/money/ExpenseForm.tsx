"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { todayISO } from "@/lib/dates";
import { EXPENSE_CATEGORIES, SPLIT_TYPES } from "@/lib/expenses/constants.ts";
import { formatMoney } from "@/lib/expenses/money.ts";
import { calculateSplits } from "@/lib/expenses/validateSplit.ts";
import type { SplitType } from "@/lib/expenses/validateSplit.ts";
import type { Expense, ExpenseSplit, Roommate } from "@/types/database";

export type ExpenseFormValues = {
  title: string;
  description: string | null;
  amount: number;
  expenseDate: string;
  category: string;
  paidBy: string;
  splitType: SplitType;
  participantIds: string[];
  exactAmounts: Record<string, number>;
  percentages: Record<string, number>;
  shares: Record<string, number>;
};

export function ExpenseForm({
  roommates,
  currentRoommateId,
  initial,
  initialSplits,
  submitLabel,
  busy,
  onSubmit,
}: {
  roommates: Roommate[];
  currentRoommateId: string;
  initial?: Expense;
  initialSplits?: ExpenseSplit[];
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [expenseDate, setExpenseDate] = useState(initial?.expense_date ?? todayISO());
  const [category, setCategory] = useState(initial?.category ?? "groceries");
  const [paidBy, setPaidBy] = useState(initial?.paid_by ?? currentRoommateId);
  const [splitType, setSplitType] = useState<SplitType>(initial?.split_type ?? "equal");
  const [selected, setSelected] = useState<string[]>(
    initialSplits?.map((split) => split.roommate_id) ?? roommates.map((person) => person.id)
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(
    Object.fromEntries(
      (initialSplits ?? []).map((split) => [split.roommate_id, String(split.owed_amount)])
    )
  );
  const [percentages, setPercentages] = useState<Record<string, string>>(
    Object.fromEntries(
      (initialSplits ?? [])
        .filter((split) => split.percentage !== null)
        .map((split) => [split.roommate_id, String(split.percentage)])
    )
  );
  const [shares, setShares] = useState<Record<string, string>>(
    Object.fromEntries(
      (initialSplits ?? [])
        .filter((split) => split.shares !== null)
        .map((split) => [split.roommate_id, String(split.shares)])
    )
  );
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const numericAmount = Number(amount);
    if (!(numericAmount > 0) || selected.length === 0) return null;
    try {
      return calculateSplits({
        amount: numericAmount,
        splitType,
        participants: selected.map((roommateId) => ({
          roommateId,
          exactAmount: Number(exactAmounts[roommateId] || 0),
          percentage: Number(percentages[roommateId] || 0),
          shares: Number(shares[roommateId] || 1),
        })),
      });
    } catch {
      return null;
    }
  }, [amount, splitType, selected, exactAmounts, percentages, shares]);

  function toggleRoommate(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const numericAmount = Number(amount);
    try {
      const values: ExpenseFormValues = {
        title: title.trim(),
        description: description.trim() || null,
        amount: numericAmount,
        expenseDate,
        category,
        paidBy,
        splitType,
        participantIds: selected,
        exactAmounts: Object.fromEntries(
          selected.map((id) => [id, Number(exactAmounts[id] || 0)])
        ),
        percentages: Object.fromEntries(
          selected.map((id) => [id, Number(percentages[id] || 0)])
        ),
        shares: Object.fromEntries(selected.map((id) => [id, Number(shares[id] || 1)])),
      };
      if (!values.title) throw new Error("Title is required");
      calculateSplits({
        amount: values.amount,
        splitType,
        participants: selected.map((roommateId) => ({
          roommateId,
          exactAmount: values.exactAmounts[roommateId],
          percentage: values.percentages[roommateId],
          shares: values.shares[roommateId],
        })),
      });
      await onSubmit(values);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save");
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-4 pb-8">
      <div className="grid gap-2">
        <Label htmlFor="expense-title">Title</Label>
        <Input
          id="expense-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Costco groceries"
          className="min-h-12 text-base"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="expense-amount">Amount</Label>
        <Input
          id="expense-amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="86.00"
          className="min-h-12 text-base"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="expense-date">Date</Label>
          <Input
            id="expense-date"
            type="date"
            value={expenseDate}
            onChange={(event) => setExpenseDate(event.target.value)}
            className="min-h-12 text-base"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="expense-category">Category</Label>
          <select
            id="expense-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="min-h-12 rounded-lg border border-input bg-transparent px-3 text-base"
          >
            {EXPENSE_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="expense-paid-by">Paid by</Label>
        <select
          id="expense-paid-by"
          value={paidBy}
          onChange={(event) => setPaidBy(event.target.value)}
          className="min-h-12 rounded-lg border border-input bg-transparent px-3 text-base"
        >
          {roommates.map((roommate) => (
            <option key={roommate.id} value={roommate.id}>
              {roommate.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="expense-notes">Notes</Label>
        <Textarea
          id="expense-notes"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional"
          className="min-h-20 text-base"
        />
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Split with</legend>
        <div className="flex flex-wrap gap-2">
          {roommates.map((roommate) => {
            const active = selected.includes(roommate.id);
            return (
              <button
                key={roommate.id}
                type="button"
                onClick={() => toggleRoommate(roommate.id)}
                className={`min-h-11 rounded-full px-3 text-sm font-medium ring-1 ${
                  active
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-card text-foreground ring-border"
                }`}
              >
                {roommate.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Split type</legend>
        <div className="grid grid-cols-4 gap-2">
          {SPLIT_TYPES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSplitType(item.value)}
              className={`min-h-11 rounded-xl text-sm font-medium ring-1 ${
                splitType === item.value
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card ring-border"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>

      {splitType !== "equal" ? (
        <div className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-border">
          {selected.map((id) => {
            const roommate = roommates.find((person) => person.id === id);
            return (
              <div key={id} className="grid grid-cols-[1fr_7rem] items-center gap-3">
                <Label htmlFor={`split-${id}`}>{roommate?.name}</Label>
                <Input
                  id={`split-${id}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  className="min-h-11"
                  value={
                    splitType === "exact"
                      ? (exactAmounts[id] ?? "")
                      : splitType === "percentage"
                        ? (percentages[id] ?? "")
                        : (shares[id] ?? "1")
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    if (splitType === "exact") {
                      setExactAmounts((current) => ({ ...current, [id]: value }));
                    } else if (splitType === "percentage") {
                      setPercentages((current) => ({ ...current, [id]: value }));
                    } else {
                      setShares((current) => ({ ...current, [id]: value }));
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {preview ? (
        <ul className="rounded-3xl bg-secondary px-4 py-3 text-sm">
          {preview.map((split) => {
            const roommate = roommates.find((person) => person.id === split.roommateId);
            return (
              <li key={split.roommateId} className="flex justify-between py-1">
                <span>{roommate?.name}</span>
                <span>{formatMoney(split.owedAmount)}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="min-h-12" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
