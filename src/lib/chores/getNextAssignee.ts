export type RotationSeat = {
  roommateId: string;
  position: number;
};

export function getNextAssignee(input: {
  rotations: RotationSeat[];
  activeRoommateIds: string[];
  lastAssigneeId: string | null;
  startOffset?: number;
}): string {
  const active = input.rotations
    .filter((seat) => input.activeRoommateIds.includes(seat.roommateId))
    .sort((a, b) => a.position - b.position || a.roommateId.localeCompare(b.roommateId));

  if (active.length === 0) {
    throw new Error("No active roommates in this rotation");
  }

  if (!input.lastAssigneeId) {
    const offset = ((input.startOffset ?? 0) % active.length + active.length) % active.length;
    return active[offset].roommateId;
  }

  const index = active.findIndex((seat) => seat.roommateId === input.lastAssigneeId);
  const nextIndex = index === -1 ? 0 : (index + 1) % active.length;
  return active[nextIndex].roommateId;
}

export function assignWeeks(input: {
  rotations: RotationSeat[];
  activeRoommateIds: string[];
  weekCount: number;
  startOffset?: number;
}): string[] {
  const assigned: string[] = [];
  let lastAssigneeId: string | null = null;

  for (let week = 0; week < input.weekCount; week += 1) {
    const next = getNextAssignee({
      rotations: input.rotations,
      activeRoommateIds: input.activeRoommateIds,
      lastAssigneeId,
      startOffset: lastAssigneeId === null ? input.startOffset : undefined,
    });
    assigned.push(next);
    lastAssigneeId = next;
  }

  return assigned;
}
