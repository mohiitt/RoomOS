"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpenseForm } from "@/components/money/ExpenseForm";
import type { ExpenseFormValues } from "@/components/money/ExpenseForm";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import {
  getExpense,
  listSplitsForExpense,
  saveExpense,
} from "@/lib/expenses/queries.ts";
import { calculateSplits } from "@/lib/expenses/validateSplit.ts";
import type { Expense, ExpenseSplit } from "@/types/database";

export default function EditExpensePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { roommate, roommates } = useRoommate();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([getExpense(params.id), listSplitsForExpense(params.id)])
      .then(([nextExpense, nextSplits]) => {
        setExpense(nextExpense);
        setSplits(nextSplits);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load expense");
      });
  }, [params.id]);

  async function onSubmit(values: ExpenseFormValues) {
    if (!roommate || !expense) return;
    setBusy(true);
    try {
      const nextSplits = calculateSplits({
        amount: values.amount,
        splitType: values.splitType,
        participants: values.participantIds.map((roommateId) => ({
          roommateId,
          exactAmount: values.exactAmounts[roommateId],
          percentage: values.percentages[roommateId],
          shares: values.shares[roommateId],
        })),
      });
      await saveExpense({
        id: expense.id,
        title: values.title,
        description: values.description,
        amount: values.amount,
        paidBy: values.paidBy,
        category: values.category,
        splitType: values.splitType,
        expenseDate: values.expenseDate,
        createdBy: roommate.id,
        splits: nextSplits,
      });
      toast.success("Expense updated");
      router.push(`/money/expense/${expense.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!expense || !roommate) return <LoadingSkeleton rows={3} />;

  return (
    <div>
      <PageHeader title="Edit expense" subtitle={expense.title} />
      <ExpenseForm
        roommates={roommates}
        currentRoommateId={roommate.id}
        initial={expense}
        initialSplits={splits}
        submitLabel="Save changes"
        busy={busy}
        onSubmit={onSubmit}
      />
    </div>
  );
}
