import { centsToDollars, dollarsToCents } from "./money.ts";
import type { NetBalance, SimplifiedDebt } from "./calculateBalances.ts";

export function simplifyDebts(balances: NetBalance[]): SimplifiedDebt[] {
  const debtors = balances
    .map((balance) => ({
      roommateId: balance.roommateId,
      cents: dollarsToCents(balance.net),
    }))
    .filter((balance) => balance.cents < 0)
    .sort((a, b) => a.cents - b.cents || a.roommateId.localeCompare(b.roommateId));

  const creditors = balances
    .map((balance) => ({
      roommateId: balance.roommateId,
      cents: dollarsToCents(balance.net),
    }))
    .filter((balance) => balance.cents > 0)
    .sort((a, b) => b.cents - a.cents || a.roommateId.localeCompare(b.roommateId));

  const result: SimplifiedDebt[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(-debtor.cents, creditor.cents);
    if (amount > 0) {
      result.push({
        fromId: debtor.roommateId,
        toId: creditor.roommateId,
        amount: centsToDollars(amount),
      });
    }
    debtor.cents += amount;
    creditor.cents -= amount;
    if (debtor.cents === 0) i += 1;
    if (creditor.cents === 0) j += 1;
  }

  return result;
}
