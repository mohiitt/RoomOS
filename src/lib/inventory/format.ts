export function formatQuantity(quantity: number, unit?: string): string {
  const formatted = Number.isInteger(quantity)
    ? String(quantity)
    : quantity.toFixed(3).replace(/\.?0+$/, "");
  return unit ? `${formatted} ${unit}` : formatted;
}
