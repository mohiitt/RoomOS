export type UnlockStatus = "pin" | "select" | "ready";

export function knownRoommateId(
  storedRoommateId: string | null,
  roommateIds: string[]
): string | null {
  if (!storedRoommateId) return null;
  return roommateIds.includes(storedRoommateId) ? storedRoommateId : null;
}

export function resolveUnlockStatus(input: {
  hasAccess: boolean;
  storedRoommateId: string | null;
  roommateIds: string[];
}): UnlockStatus {
  const stored = knownRoommateId(input.storedRoommateId, input.roommateIds);
  if (input.hasAccess && stored) return "ready";
  if (input.hasAccess) return "select";
  if (stored) return "pin";
  return "select";
}

export function statusAfterVerifiedPin(
  storedRoommateId: string | null,
  roommateIds: string[]
): "ready" | "select" {
  return knownRoommateId(storedRoommateId, roommateIds) ? "ready" : "select";
}

export function statusAfterSelectingRoommate(hasAccess: boolean): "ready" | "pin" {
  return hasAccess ? "ready" : "pin";
}
