export const EXPENSE_CATEGORIES = [
  { value: "groceries", label: "Groceries" },
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "internet", label: "Internet" },
  { value: "household", label: "Household" },
  { value: "dining", label: "Dining" },
  { value: "transportation", label: "Transportation" },
  { value: "other", label: "Other" },
] as const;

export const SPLIT_TYPES = [
  { value: "equal", label: "Equal" },
  { value: "exact", label: "Exact" },
  { value: "percentage", label: "%" },
  { value: "shares", label: "Shares" },
] as const;

export function labelForCategory(value: string | null): string {
  if (!value) return "Uncategorized";
  return EXPENSE_CATEGORIES.find((item) => item.value === value)?.label ?? value;
}
