import { centsToDollars, dollarsToCents } from "./money.ts";

export type SplitType = "equal" | "exact" | "percentage" | "shares";

export type SplitInput = {
  roommateId: string;
  exactAmount?: number;
  percentage?: number;
  shares?: number;
};

export type SplitResult = {
  roommateId: string;
  owedAmount: number;
  percentage: number | null;
  shares: number | null;
};

function allocateByWeights(totalCents: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0) {
    throw new Error("Split weights must be greater than zero");
  }

  const raw = weights.map((weight) => (totalCents * weight) / weightSum);
  const floors = raw.map((value) => Math.floor(value));
  const remainder = totalCents - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  const result = [...floors];
  for (let i = 0; i < remainder; i += 1) {
    result[order[i].index] += 1;
  }
  return result;
}

export function calculateSplits(input: {
  amount: number;
  splitType: SplitType;
  participants: SplitInput[];
}): SplitResult[] {
  if (!(input.amount > 0)) {
    throw new Error("Amount must be greater than zero");
  }
  if (input.participants.length < 1) {
    throw new Error("Choose at least one roommate");
  }

  const ids = input.participants.map((person) => person.roommateId);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Each roommate can only appear once");
  }

  const totalCents = dollarsToCents(input.amount);

  if (input.splitType === "equal") {
    const cents = allocateByWeights(
      totalCents,
      input.participants.map(() => 1)
    );
    return input.participants.map((person, index) => ({
      roommateId: person.roommateId,
      owedAmount: centsToDollars(cents[index]),
      percentage: null,
      shares: null,
    }));
  }

  if (input.splitType === "exact") {
    const cents = input.participants.map((person) => {
      if (person.exactAmount === undefined || person.exactAmount < 0) {
        throw new Error("Every participant needs an amount");
      }
      return dollarsToCents(person.exactAmount);
    });
    const sum = cents.reduce((total, value) => total + value, 0);
    if (sum !== totalCents) {
      throw new Error("Exact amounts must add up to the total");
    }
    return input.participants.map((person, index) => ({
      roommateId: person.roommateId,
      owedAmount: centsToDollars(cents[index]),
      percentage: null,
      shares: null,
    }));
  }

  if (input.splitType === "percentage") {
    const percents = input.participants.map((person) => {
      if (person.percentage === undefined || person.percentage < 0) {
        throw new Error("Every participant needs a percentage");
      }
      return person.percentage;
    });
    const percentSum = percents.reduce((total, value) => total + value, 0);
    if (Math.round(percentSum * 1000) !== 100 * 1000) {
      throw new Error("Percentages must add up to 100");
    }
    const cents = allocateByWeights(totalCents, percents);
    return input.participants.map((person, index) => ({
      roommateId: person.roommateId,
      owedAmount: centsToDollars(cents[index]),
      percentage: percents[index],
      shares: null,
    }));
  }

  const shares = input.participants.map((person) => {
    if (person.shares === undefined || person.shares <= 0) {
      throw new Error("Every participant needs shares greater than zero");
    }
    return person.shares;
  });
  const cents = allocateByWeights(totalCents, shares);
  return input.participants.map((person, index) => ({
    roommateId: person.roommateId,
    owedAmount: centsToDollars(cents[index]),
    percentage: null,
    shares: shares[index],
  }));
}

export function splitTotalsMatch(amount: number, splits: SplitResult[]): boolean {
  const splitCents = splits.reduce(
    (sum, split) => sum + dollarsToCents(split.owedAmount),
    0
  );
  return splitCents === dollarsToCents(amount);
}
