import Link from "next/link";
import { formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/expenses/money.ts";
import type { Expense, Roommate } from "@/types/database";

export function ExpenseCard({
  expense,
  payer,
  yourShare,
}: {
  expense: Expense;
  payer?: Roommate;
  yourShare: number | null;
}) {
  return (
    <Link
      href={`/money/expense/${expense.id}`}
      className="block rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold leading-tight">{expense.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatShortDate(expense.expense_date)} · Paid by {payer?.name ?? "someone"}
          </p>
        </div>
        <p className="text-lg font-semibold">{formatMoney(expense.amount)}</p>
      </div>
      {yourShare !== null ? (
        <p className="mt-2 text-sm text-muted-foreground">You owe {formatMoney(yourShare)}</p>
      ) : null}
    </Link>
  );
}
