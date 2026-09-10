"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FloatingActionButton } from "@/components/layout/FloatingActionButton";
import { BalanceCard } from "@/components/money/BalanceCard";
import { ExpenseCard } from "@/components/money/ExpenseCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { formatMoney } from "@/lib/expenses/money.ts";
import {
  generateDueRecurringExpenses,
  listExpenses,
  listSettlements,
  listSplits,
} from "@/lib/expenses/queries.ts";
import { buildMoneyView } from "@/lib/expenses/view.ts";
import { useRealtimeExpenses } from "@/hooks/useRealtime.ts";
import type { Expense, ExpenseSplit, Settlement } from "@/types/database";

export default function MoneyPage() {
  const { roommate, roommates } = useRoommate();
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextExpenses, nextSplits, nextSettlements] = await Promise.all([
        listExpenses(),
        listSplits(),
        listSettlements(),
      ]);
      setExpenses(nextExpenses);
      setSplits(nextSplits);
      setSettlements(nextSettlements);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load money");
      setExpenses([]);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await generateDueRecurringExpenses();
        await refresh();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load money");
        setExpenses([]);
      }
    })();
  }, [refresh]);
  const onRealtime = useCallback(() => {
    void refresh();
  }, [refresh]);
  useRealtimeExpenses(onRealtime);

  const view = useMemo(() => {
    if (!roommate) return null;
    return buildMoneyView({
      roommateIds: roommates.map((person) => person.id),
      viewerId: roommate.id,
      expenses: expenses ?? [],
      splits,
      settlements,
    });
  }, [roommate, roommates, expenses, splits, settlements]);

  const nameFor = (id: string) =>
    roommates.find((person) => person.id === id)?.name ?? "Roommate";

  return (
    <div>
      <PageHeader title="Money" subtitle="Who owes whom, without the spreadsheet." />
      {expenses === null || !view || !roommate ? (
        <LoadingSkeleton rows={3} />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="grid gap-4 pb-16">
          <BalanceCard
            youOwe={view.totals.youOwe}
            youAreOwed={view.totals.youAreOwed}
            net={view.totals.net}
          />

          {view.debts.filter((debt) => debt.fromId === roommate.id).length > 0 ? (
            <section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
              <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                You owe
              </h2>
              <ul className="mt-3 grid gap-2">
                {view.debts
                  .filter((debt) => debt.fromId === roommate.id)
                  .map((debt) => (
                    <li key={`${debt.fromId}-${debt.toId}`} className="flex justify-between text-base">
                      <span>{nameFor(debt.toId)}</span>
                      <span className="font-medium">{formatMoney(debt.amount)}</span>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}

          {view.debts.filter((debt) => debt.toId === roommate.id).length > 0 ? (
            <section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
              <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                You are owed
              </h2>
              <ul className="mt-3 grid gap-2">
                {view.debts
                  .filter((debt) => debt.toId === roommate.id)
                  .map((debt) => (
                    <li key={`${debt.fromId}-${debt.toId}`} className="flex justify-between text-base">
                      <span>{nameFor(debt.fromId)}</span>
                      <span className="font-medium">{formatMoney(debt.amount)}</span>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/money/settle"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium"
            >
              Settle up
            </Link>
            <Link
              href="/money/recurring"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium"
            >
              Recurring
            </Link>
          </div>

          <h2 className="pt-2 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Recent expenses
          </h2>
          {expenses.length === 0 ? (
            <EmptyState
              title="No expenses yet."
              description="Add your first shared expense."
            />
          ) : (
            expenses.map((expense) => {
              const share = view.splitsByExpense
                .get(expense.id)
                ?.find((split) => split.roommate_id === roommate.id);
              return (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  payer={roommates.find((person) => person.id === expense.paid_by)}
                  yourShare={
                    expense.paid_by === roommate.id ? null : (share?.owed_amount ?? null)
                  }
                />
              );
            })
          )}
        </div>
      )}
      <FloatingActionButton href="/money/new" label="Add expense" />
    </div>
  );
}
