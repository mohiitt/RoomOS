export type StreakAssignment = {
  status: "pending" | "completed" | "missed" | "skipped";
  dueDate: string;
};

export function calculateStreak(assignments: StreakAssignment[]): number {
  const chronological = [...assignments].sort((a, b) =>
    a.dueDate < b.dueDate ? 1 : a.dueDate > b.dueDate ? -1 : 0
  );

  let streak = 0;
  for (const assignment of chronological) {
    if (assignment.status === "pending" || assignment.status === "skipped") {
      continue;
    }
    if (assignment.status === "completed") {
      streak += 1;
      continue;
    }
    break;
  }
  return streak;
}

export function totalPoints(
  assignments: { status: string; pointsAwarded: number | null }[]
): number {
  return assignments.reduce((sum, assignment) => {
    if (assignment.status !== "completed") return sum;
    return sum + (assignment.pointsAwarded ?? 0);
  }, 0);
}
