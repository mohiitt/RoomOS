export type Roommate = {
  id: string;
  name: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type OwnershipType = "shared" | "personal";

export type StorageLocation =
  | "fridge"
  | "freezer"
  | "pantry"
  | "kitchen"
  | "other";

export type InventoryCategory =
  | "vegetables"
  | "fruits"
  | "dairy"
  | "meat"
  | "frozen"
  | "snacks"
  | "grains"
  | "spices"
  | "beverages"
  | "household"
  | "other";

export type TransactionType =
  | "consume"
  | "add"
  | "adjust"
  | "purchase"
  | "discard"
  | "expired";

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: InventoryCategory | string | null;
  storage_location: StorageLocation;
  ownership_type: OwnershipType;
  owner_id: string | null;
  expiry_date: string | null;
  minimum_quantity: number | null;
  auto_add_to_shopping: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryTransaction = {
  id: string;
  inventory_item_id: string;
  roommate_id: string | null;
  transaction_type: TransactionType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  note: string | null;
  created_at: string;
};

export type ExpiryStatus = "expired" | "critical" | "soon" | "normal" | "none";

export type ShoppingReason = "manual" | "low_stock" | "expired" | "planned";
export type ShoppingStatus = "needed" | "purchased" | "removed";

export type ShoppingItem = {
  id: string;
  name: string;
  inventory_item_id: string | null;
  requested_quantity: number | null;
  unit: string | null;
  reason: ShoppingReason;
  status: ShoppingStatus;
  added_by: string | null;
  purchased_by: string | null;
  created_at: string;
  purchased_at: string | null;
};

export type SplitType = "equal" | "exact" | "percentage" | "shares";

export type Expense = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  paid_by: string;
  category: string | null;
  split_type: SplitType;
  expense_date: string;
  is_recurring: boolean;
  recurring_rule_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  roommate_id: string;
  owed_amount: number;
  percentage: number | null;
  shares: number | null;
  created_at: string;
};

export type Settlement = {
  id: string;
  payer_id: string;
  receiver_id: string;
  amount: number;
  settled_at: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type RecurringExpense = {
  id: string;
  title: string;
  amount: number;
  paid_by: string | null;
  category: string | null;
  split_type: SplitType;
  frequency: "weekly" | "monthly" | "custom";
  next_run_at: string;
  is_active: boolean;
  created_at: string;
  split_config: RecurringSplitShare[];
};

export type RecurringSplitShare = {
  roommate_id: string;
  owed_amount: number;
  percentage: number | null;
  shares: number | null;
};

export type ExpenseAttachment = {
  id: string;
  expense_id: string;
  storage_path: string;
  storage_url: string;
  uploaded_by: string | null;
  created_at: string;
};

export type ChoreFrequency = "weekly" | "monthly";
export type ChoreStatus = "pending" | "completed" | "missed" | "skipped";

export type ChoreTemplate = {
  id: string;
  name: string;
  description: string | null;
  frequency: ChoreFrequency;
  points: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
};

export type ChoreRotation = {
  id: string;
  chore_template_id: string;
  roommate_id: string;
  rotation_position: number;
};

export type ChoreAssignment = {
  id: string;
  chore_template_id: string;
  assigned_to: string;
  due_date: string;
  status: ChoreStatus;
  completed_at: string | null;
  completed_by: string | null;
  points_awarded: number | null;
  created_at: string;
};

export type ChoreSwapRequest = {
  id: string;
  assignment_id: string;
  from_roommate_id: string;
  to_roommate_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
};

export type ConcernPriority = "low" | "medium" | "high" | "urgent";
export type ConcernStatus = "open" | "assigned" | "in_progress" | "resolved";

export type Concern = {
  id: string;
  title: string;
  description: string | null;
  priority: ConcernPriority;
  status: ConcernStatus;
  reported_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type ConcernComment = {
  id: string;
  concern_id: string;
  roommate_id: string | null;
  comment: string;
  created_at: string;
};

export type ConcernAttachment = {
  id: string;
  concern_id: string;
  storage_path: string;
  storage_url: string;
  uploaded_by: string | null;
  created_at: string;
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  name: string;
  quantity: string;
  unit: string;
  sort_order: number;
};

export type Recipe = {
  id: string;
  name: string;
  instructions: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RecipeWithIngredients = Recipe & {
  ingredients: RecipeIngredient[];
};

export type Notification = {
  id: string;
  roommate_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};
