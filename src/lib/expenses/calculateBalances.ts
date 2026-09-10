import { centsToDollars, dollarsToCents } from "./money.ts";

export type NetBalance = {
  roommateId: string;
  net: number;
};

export type SimplifiedDebt = {
  fromId: string;
  toId: string;
  amount: number;
};

export type ExpenseLedgerItem = {
  paidBy: string;
  splits: { roommateId: string; owedAmount: number }[];
};

export type SettlementLedgerItem = {
  payerId: string;
  receiverId: string;
  amount: number;
};

export function calculateNets(
  roommateIds: string[],
  expenses: ExpenseLedgerItem[],
  settlements: SettlementLedgerItem[]
): NetBalance[] {
  const nets = new Map(roommateIds.map((id) => [id, 0]));

  for (const expense of expenses) {
    const paid = nets.get(expense.paidBy);
    if (paid === undefined) continue;
    const total = expense.splits.reduce((sum, split) => sum + dollarsToCents(split.owedAmount), 0);
    nets.set(expense.paidBy, paid + total);
    for (const split of expense.splits) {
      const current = nets.get(split.roommateId);
      if (current === undefined) continue;
      nets.set(split.roommateId, current - dollarsToCents(split.owedAmount));
    }
  }

  for (const settlement of settlements) {
    const payer = nets.get(settlement.payerId);
    const receiver = nets.get(settlement.receiverId);
    if (payer === undefined || receiver === undefined) continue;
    const cents = dollarsToCents(settlement.amount);
    nets.set(settlement.payerId, payer + cents);
    nets.set(settlement.receiverId, receiver - cents);
  }

  return roommateIds.map((roommateId) => ({
    roommateId,
    net: centsToDollars(nets.get(roommateId) ?? 0),
  }));
}

export function viewerTotals(viewerId: string, debts: SimplifiedDebt[]) {
  const youOwe = debts
    .filter((debt) => debt.fromId === viewerId)
    .reduce((sum, debt) => sum + dollarsToCents(debt.amount), 0);
  const youAreOwed = debts
    .filter((debt) => debt.toId === viewerId)
    .reduce((sum, debt) => sum + dollarsToCents(debt.amount), 0);

  return {
    youOwe: centsToDollars(youOwe),
    youAreOwed: centsToDollars(youAreOwed),
    net: centsToDollars(youAreOwed - youOwe),
  };
}
