import { calculateNets, viewerTotals, type NetBalance } from "./calculateBalances.ts";
import { simplifyDebts } from "./simplifyDebts.ts";
import type { Expense, ExpenseSplit, Settlement } from "../../types/database.ts";

export function moneyViewFromNets(nets: NetBalance[], viewerId: string) {
  const debts = simplifyDebts(nets);
  const totals = viewerTotals(viewerId, debts);
  return { nets, debts, totals };
}

export function buildMoneyView(input: {
  roommateIds: string[];
  viewerId: string;
  expenses: Expense[];
  splits: ExpenseSplit[];
  settlements: Settlement[];
}) {
  const splitsByExpense = new Map<string, ExpenseSplit[]>();
  for (const split of input.splits) {
    const current = splitsByExpense.get(split.expense_id) ?? [];
    current.push(split);
    splitsByExpense.set(split.expense_id, current);
  }

  const nets = calculateNets(
    input.roommateIds,
    input.expenses.map((expense) => ({
      paidBy: expense.paid_by,
      splits: (splitsByExpense.get(expense.id) ?? []).map((split) => ({
        roommateId: split.roommate_id,
        owedAmount: split.owed_amount,
      })),
    })),
    input.settlements.map((settlement) => ({
      payerId: settlement.payer_id,
      receiverId: settlement.receiver_id,
      amount: settlement.amount,
    }))
  );

  return { ...moneyViewFromNets(nets, input.viewerId), splitsByExpense };
}
