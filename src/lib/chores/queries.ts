import { apiJson } from "@/lib/api/browser";
import type {
  ChoreAssignment,
  ChoreFrequency,
  ChoreRotation,
  ChoreStatus,
  ChoreSwapRequest,
  ChoreTemplate,
} from "@/types/database";

export async function listChoreTemplates(): Promise<ChoreTemplate[]> {
  return apiJson<ChoreTemplate[]>("/api/chores/templates");
}

export async function listChoreRotations(): Promise<ChoreRotation[]> {
  return apiJson<ChoreRotation[]>("/api/chores/rotations");
}

export async function listChoreAssignments(): Promise<ChoreAssignment[]> {
  return apiJson<ChoreAssignment[]>("/api/chores/assignments");
}

export async function generateDueChoreAssignments(): Promise<number> {
  const payload = await apiJson<{ count: number }>("/api/chores/generate", { method: "POST" });
  return payload.count;
}

export async function completeChoreAssignment(
  assignmentId: string,
  roommateId: string,
  forSomeoneElse = false
): Promise<void> {
  await apiJson(`/api/chores/assignments/${assignmentId}/complete`, {
    method: "POST",
    body: JSON.stringify({ roommateId, forSomeoneElse }),
  });
}

export async function createChore(input: {
  name: string;
  description: string | null;
  points?: number;
  frequency?: ChoreFrequency;
  createdBy: string;
  roommateIds: string[];
}): Promise<string> {
  const payload = await apiJson<{ id: string }>("/api/chores", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.id;
}

export async function updateChore(input: {
  id: string;
  name: string;
  description: string | null;
  points?: number;
  frequency?: ChoreFrequency;
  roommateIds: string[];
}): Promise<void> {
  await apiJson(`/api/chores/${input.id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function listPendingSwaps(): Promise<ChoreSwapRequest[]> {
  return apiJson<ChoreSwapRequest[]>("/api/chores/swaps");
}

export async function requestChoreSwap(assignmentId: string, toRoommateId: string): Promise<void> {
  await apiJson("/api/chores/swaps", {
    method: "POST",
    body: JSON.stringify({ assignmentId, toRoommateId }),
  });
}

export async function respondChoreSwap(id: string, accept: boolean): Promise<void> {
  await apiJson(`/api/chores/swaps/${id}`, {
    method: "POST",
    body: JSON.stringify({ accept }),
  });
}

export async function seedDefaultChores(createdBy: string, roommateIds: string[]): Promise<void> {
  await apiJson("/api/chores/seed", {
    method: "POST",
    body: JSON.stringify({ createdBy, roommateIds }),
  });
}

export function statusTone(
  status: ChoreStatus
): "neutral" | "good" | "warn" | "bad" {
  if (status === "completed") return "good";
  if (status === "missed") return "bad";
  if (status === "skipped") return "warn";
  return "neutral";
}
