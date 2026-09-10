"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { formatShortDate } from "@/lib/dates";
import { labelForCategory } from "@/lib/expenses/constants.ts";
import { formatMoney } from "@/lib/expenses/money.ts";
import {
  deleteExpense,
  getExpense,
  listSplitsForExpense,
} from "@/lib/expenses/queries.ts";
import type { Expense, ExpenseSplit } from "@/types/database";
import { useRealtimeExpenses } from "@/hooks/useRealtime.ts";

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { roommate, roommates } = useRoommate();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    void Promise.all([getExpense(params.id), listSplitsForExpense(params.id)])
      .then(([nextExpense, nextSplits]) => {
        setExpense(nextExpense);
        setSplits(nextSplits);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load expense");
      });
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtimeExpenses(load);

  async function onDelete() {
    if (!expense) return;
    setBusy(true);
    try {
      await deleteExpense(expense.id);
      toast.success("Expense deleted");
      router.push("/money");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Could not delete");
      setBusy(false);
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!expense) return <LoadingSkeleton rows={3} />;

  const payer = roommates.find((person) => person.id === expense.paid_by);
  const yourShare = splits.find((split) => split.roommate_id === roommate?.id);

  return (
    <div className="pb-8">
      <PageHeader title={expense.title} subtitle={labelForCategory(expense.category)} />
      <section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
        <p className="font-heading text-4xl">{formatMoney(expense.amount)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge>Paid by {payer?.name ?? "someone"}</StatusBadge>
          <StatusBadge tone="info">{formatShortDate(expense.expense_date)}</StatusBadge>
          <StatusBadge>{expense.split_type}</StatusBadge>
        </div>
        {expense.description ? <p className="mt-3 text-sm">{expense.description}</p> : null}
        {yourShare ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Your share: {formatMoney(yourShare.owed_amount)}
          </p>
        ) : null}
      </section>

      <section className="mt-5">
        <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Split
        </h2>
        <ul className="mt-3 grid gap-2">
          {splits.map((split) => {
            const person = roommates.find((roommateItem) => roommateItem.id === split.roommate_id);
            return (
              <li
                key={split.id}
                className="flex justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-border"
              >
                <span>{person?.name}</span>
                <span className="font-medium">{formatMoney(split.owed_amount)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-5 flex gap-3">
        <Link
          href={`/money/expense/${expense.id}/edit`}
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

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this expense?"
        description="Balances will be recalculated from the remaining ledger."
        confirmLabel="Delete"
        busy={busy}
        onOpenChange={setConfirmDelete}
        onConfirm={() => void onDelete()}
      />
    </div>
  );
}
