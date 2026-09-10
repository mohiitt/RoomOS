export function isLowStock(
  quantity: number,
  minimumQuantity: number | null | undefined
): boolean {
  if (minimumQuantity === null || minimumQuantity === undefined) return false;
  return quantity <= minimumQuantity;
}
