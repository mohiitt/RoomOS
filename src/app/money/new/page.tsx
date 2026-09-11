"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpenseForm } from "@/components/money/ExpenseForm";
import type { ExpenseFormValues } from "@/components/money/ExpenseForm";
import { useRoommate } from "@/contexts/CurrentRoommateContext";
import { saveExpense, uploadExpensePhoto } from "@/lib/expenses/queries.ts";
import { calculateSplits } from "@/lib/expenses/validateSplit.ts";

export default function NewExpensePage() {
  const router = useRouter();
  const { roommate, roommates } = useRoommate();
  const [busy, setBusy] = useState(false);

  async function onSubmit(values: ExpenseFormValues) {
    if (!roommate) return;
    setBusy(true);
    try {
      const splits = calculateSplits({
        amount: values.amount,
        splitType: values.splitType,
        participants: values.participantIds.map((roommateId) => ({
          roommateId,
          exactAmount: values.exactAmounts[roommateId],
          percentage: values.percentages[roommateId],
          shares: values.shares[roommateId],
        })),
      });
      const id = await saveExpense({
        title: values.title,
        description: values.description,
        amount: values.amount,
        paidBy: values.paidBy,
        category: values.category,
        splitType: values.splitType,
        expenseDate: values.expenseDate,
        createdBy: roommate.id,
        splits,
      });
      if (values.receipt) {
        await uploadExpensePhoto(id, values.receipt);
      }
      toast.success("Expense added");
      router.push("/money");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Add expense" subtitle="Split it while the receipt is still around." backHref="/money" />
      {roommate ? (
        <ExpenseForm
          roommates={roommates}
          currentRoommateId={roommate.id}
          submitLabel="Save expense"
          busy={busy}
          onSubmit={onSubmit}
        />
      ) : null}
    </div>
  );
}
