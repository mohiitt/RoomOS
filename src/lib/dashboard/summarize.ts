export type ActivityEvent = {
  id: string;
  createdAt: string;
  roommateId: string | null;
  summary: string;
  href: string;
};

export type AttentionItem = {
  id: string;
  href: string;
  title: string;
  detail: string;
};

function nameOf(names: Record<string, string>, id: string | null): string {
  if (!id) return "Someone";
  return names[id] ?? "Someone";
}

export function moneyHeadline(
  net: number,
  format: (value: number) => string
): string {
  if (net === 0) return "Settled up";
  if (net > 0) return `You're owed ${format(net)}`;
  return `You owe ${format(net)}`;
}

export function foodHeadline(expiring: number, low: number): string {
  return `${expiring} expiring · ${low} low-stock`;
}

export function choreHeadline(yours: number, pending: number, hasTemplates: boolean): string {
  if (!hasTemplates && pending === 0) return "Set up the weekly rotation.";
  if (yours > 0) return yours === 1 ? "You have 1 chore this week" : `You have ${yours} chores this week`;
  if (pending > 0) return pending === 1 ? "1 pending this week" : `${pending} pending this week`;
  return "All caught up";
}

export function issueHeadline(openCount: number): string {
  if (openCount === 0) return "No open issues";
  if (openCount === 1) return "1 open issue";
  return `${openCount} open issues`;
}

export function shoppingHeadline(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"} needed`;
}

export function mergeActivity(events: ActivityEvent[], limit = 12): ActivityEvent[] {
  return [...events]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, limit);
}

export function eventsFromExpenses(
  expenses: { id: string; title: string; paid_by: string; created_at: string }[],
  names: Record<string, string>
): ActivityEvent[] {
  return expenses.map((expense) => ({
    id: `expense-${expense.id}`,
    createdAt: expense.created_at,
    roommateId: expense.paid_by,
    summary: `${nameOf(names, expense.paid_by)} added ${expense.title}`,
    href: `/money/expense/${expense.id}`,
  }));
}

export function eventsFromSettlements(
  settlements: {
    id: string;
    payer_id: string;
    receiver_id: string;
    created_at: string;
  }[],
  names: Record<string, string>
): ActivityEvent[] {
  return settlements.map((settlement) => ({
    id: `settlement-${settlement.id}`,
    createdAt: settlement.created_at,
    roommateId: settlement.payer_id,
    summary: `${nameOf(names, settlement.payer_id)} settled up with ${nameOf(names, settlement.receiver_id)}`,
    href: "/money",
  }));
}

export function eventsFromInventory(
  transactions: {
    id: string;
    inventory_item_id: string;
    roommate_id: string | null;
    transaction_type: string;
    created_at: string;
  }[],
  itemNames: Record<string, string>,
  names: Record<string, string>
): ActivityEvent[] {
  const verb: Record<string, string> = {
    consume: "used",
    add: "added",
    purchase: "restocked",
    discard: "discarded",
    expired: "cleared expired",
    adjust: "adjusted",
  };
  return transactions.map((row) => {
    const item = itemNames[row.inventory_item_id] ?? "an item";
    const action = verb[row.transaction_type] ?? "updated";
    return {
      id: `inventory-${row.id}`,
      createdAt: row.created_at,
      roommateId: row.roommate_id,
      summary: `${nameOf(names, row.roommate_id)} ${action} ${item}`,
      href: `/inventory/${row.inventory_item_id}`,
    };
  });
}

export function eventsFromShopping(
  items: {
    id: string;
    name: string;
    status: string;
    added_by: string | null;
    purchased_by: string | null;
    created_at: string;
    purchased_at: string | null;
  }[],
  names: Record<string, string>
): ActivityEvent[] {
  return items.flatMap((item) => {
    if (item.status === "purchased") {
      return [
        {
          id: `shopping-bought-${item.id}`,
          createdAt: item.purchased_at ?? item.created_at,
          roommateId: item.purchased_by,
          summary: `${nameOf(names, item.purchased_by)} bought ${item.name}`,
          href: "/shopping",
        },
      ];
    }
    if (item.status === "needed") {
      return [
        {
          id: `shopping-added-${item.id}`,
          createdAt: item.created_at,
          roommateId: item.added_by,
          summary: `${nameOf(names, item.added_by)} added ${item.name} to shopping`,
          href: "/shopping",
        },
      ];
    }
    return [];
  });
}

export function eventsFromChores(
  assignments: {
    id: string;
    chore_template_id: string;
    assigned_to: string;
    status: string;
    completed_at: string | null;
    completed_by: string | null;
    created_at: string;
  }[],
  choreNames: Record<string, string>,
  names: Record<string, string>
): ActivityEvent[] {
  return assignments.flatMap((assignment) => {
    const chore = choreNames[assignment.chore_template_id] ?? "a chore";
    if (assignment.status === "completed") {
      return [
        {
          id: `chore-done-${assignment.id}`,
          createdAt: assignment.completed_at ?? assignment.created_at,
          roommateId: assignment.completed_by ?? assignment.assigned_to,
          summary: `${nameOf(names, assignment.completed_by ?? assignment.assigned_to)} completed ${chore}`,
          href: "/chores",
        },
      ];
    }
    if (assignment.status === "missed") {
      return [
        {
          id: `chore-missed-${assignment.id}`,
          createdAt: assignment.created_at,
          roommateId: assignment.assigned_to,
          summary: `${nameOf(names, assignment.assigned_to)} missed ${chore}`,
          href: "/chores",
        },
      ];
    }
    if (assignment.status !== "pending") return [];
    return [
      {
        id: `chore-assigned-${assignment.id}`,
        createdAt: assignment.created_at,
        roommateId: assignment.assigned_to,
        summary: `${chore} assigned to ${nameOf(names, assignment.assigned_to)}`,
        href: "/chores",
      },
    ];
  });
}

export function eventsFromConcerns(
  concerns: {
    id: string;
    title: string;
    status: string;
    reported_by: string | null;
    created_at: string;
    resolved_at: string | null;
  }[],
  names: Record<string, string>
): ActivityEvent[] {
  return concerns.flatMap((concern) => {
    const reported = {
      id: `concern-${concern.id}`,
      createdAt: concern.created_at,
      roommateId: concern.reported_by,
      summary: `${nameOf(names, concern.reported_by)} reported ${concern.title}`,
      href: `/issues/${concern.id}`,
    };
    if (concern.status === "resolved" && concern.resolved_at) {
      return [
        reported,
        {
          id: `concern-resolved-${concern.id}`,
          createdAt: concern.resolved_at,
          roommateId: concern.reported_by,
          summary: `${concern.title} was resolved`,
          href: `/issues/${concern.id}`,
        },
      ];
    }
    return [reported];
  });
}
