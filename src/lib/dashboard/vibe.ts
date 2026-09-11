import { signedMoney } from "../expenses/money.ts";

export type ApartmentVibe = {
  mood: string;
  line: string;
};

export function apartmentVibe(input: {
  overdueChores: number;
  openUrgent: number;
  moneyNet: number;
  expiring: number;
}): ApartmentVibe {
  if (input.overdueChores >= 2) {
    return { mood: "sponge drama", line: "The sponge has filed a class-action." };
  }
  if (input.openUrgent > 0) {
    return { mood: "actually broken", line: "Something in this apartment is not vibing." };
  }
  if (input.overdueChores === 1) {
    return { mood: "one loose end", line: "One chore is late. The sponge noticed." };
  }
  if (Math.abs(input.moneyNet) >= 50) {
    return { mood: "ledger tension", line: "The group chat math is getting theatrical." };
  }
  if (input.expiring >= 3) {
    return { mood: "fridge plotting", line: "The produce has formed a coalition." };
  }
  if (input.expiring >= 1) {
    return { mood: "mildly perishable", line: "The milk is writing its will." };
  }
  if (input.moneyNet !== 0) {
    return { mood: "mostly chill", line: "Nothing's on fire. The fridge is still watching." };
  }
  return { mood: "chill", line: "The fridge is judging you. Affectionately." };
}

export function moneyStatLabel(net: number): string {
  if (net === 0) return "$0.00";
  return signedMoney(net);
}

export function foodStatLabel(expiring: number, low: number): string {
  return `${expiring} expiring · ${low} low`;
}

export function shoppingStatLabel(count: number): string {
  return `${count}`;
}

export function choreStatLabel(yours: number, overdue: number): string {
  if (overdue > 0) return `${overdue} overdue`;
  return `${yours} yours`;
}

export function issueStatLabel(openCount: number): string {
  return `${openCount} open`;
}

export function streakCopy(weeks: number): { label: string; shrugging: boolean } {
  if (weeks <= 0) return { label: "Streak reset. Shrug it off.", shrugging: true };
  if (weeks === 1) return { label: "1 week flame", shrugging: false };
  return { label: `${weeks} week flame`, shrugging: false };
}

export function roommateOfTheWeek(
  scores: { id: string; name: string; points: number; earliestCompletedAt: string | null }[]
): { id: string; name: string; points: number } | null {
  const ranked = [...scores]
    .filter((row) => row.points > 0)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const aTime = a.earliestCompletedAt ?? "9999";
      const bTime = b.earliestCompletedAt ?? "9999";
      return aTime < bTime ? -1 : aTime > bTime ? 1 : 0;
    });
  const winner = ranked[0];
  if (!winner) return null;
  return { id: winner.id, name: winner.name, points: winner.points };
}

export function homeIsQuiet(input: {
  attentionCount: number;
  activityCount: number;
  hasRoommateOfWeek: boolean;
}) {
  return input.attentionCount === 0 && input.activityCount === 0 && !input.hasRoommateOfWeek;
}
