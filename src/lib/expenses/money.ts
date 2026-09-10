export function dollarsToCents(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Amount must be a number");
  return Math.round(value * 100);
}

export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

export function formatMoney(value: number): string {
  const absolute = Math.abs(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(absolute);
}

export function signedMoney(value: number): string {
  if (value === 0) return formatMoney(0);
  return `${value > 0 ? "+" : "−"}${formatMoney(value)}`;
}
