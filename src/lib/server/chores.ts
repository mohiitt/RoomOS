import "server-only";
import { getAdminInsforge } from "@/lib/insforge/admin";
import { describeError } from "@/lib/insforge/errors";
import { toNumber, toNumberOrNull } from "@/lib/dates";
import { DEFAULT_CHORES } from "@/lib/chores/constants.ts";
import type {
  ChoreAssignment,
  ChoreFrequency,
  ChoreRotation,
  ChoreStatus,
  ChoreTemplate,
} from "@/types/database";

type Raw = Record<string, unknown>;

const TEMPLATE_COLUMNS =
  "id, name, description, frequency, points, is_active, created_by, created_at";
const ASSIGNMENT_COLUMNS =
  "id, chore_template_id, assigned_to, due_date, status, completed_at, completed_by, points_awarded, created_at";
const ROTATION_COLUMNS =
  "id, chore_template_id, roommate_id, rotation_position";

function mapTemplate(row: Raw): ChoreTemplate {
  return {
    id: String(row.id),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    frequency: row.frequency === "monthly" ? "monthly" : "weekly",
    points: toNumber(row.points),
    is_active: Boolean(row.is_active),
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

function mapRotation(row: Raw): ChoreRotation {
  return {
    id: String(row.id),
    chore_template_id: String(row.chore_template_id),
    roommate_id: String(row.roommate_id),
    rotation_position: toNumber(row.rotation_position),
  };
}

function mapAssignment(row: Raw): ChoreAssignment {
  const status = String(row.status);
  return {
    id: String(row.id),
    chore_template_id: String(row.chore_template_id),
    assigned_to: String(row.assigned_to),
    due_date: String(row.due_date).slice(0, 10),
    status:
      status === "completed" || status === "missed" || status === "skipped"
        ? status
        : "pending",
    completed_at: (row.completed_at as string | null) ?? null,
    completed_by: (row.completed_by as string | null) ?? null,
    points_awarded: toNumberOrNull(row.points_awarded),
    created_at: String(row.created_at),
  };
}

function unwrapRpc(data: unknown): unknown {
  return Array.isArray(data) ? data[0] : data;
}

export async function listChoreTemplates(): Promise<ChoreTemplate[]> {
  const { data, error } = await getAdminInsforge()
    .database.from("chore_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) throw new Error(describeError(error, "Could not load chores"));
  return ((data ?? []) as Raw[]).map(mapTemplate);
}

export async function listChoreRotations(): Promise<ChoreRotation[]> {
  const { data, error } = await getAdminInsforge()
    .database.from("chore_rotations")
    .select(ROTATION_COLUMNS)
    .order("rotation_position", { ascending: true })
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load rotations"));
  return ((data ?? []) as Raw[]).map(mapRotation);
}

export async function listChoreAssignments(): Promise<ChoreAssignment[]> {
  const { data, error } = await getAdminInsforge()
    .database.from("chore_assignments")
    .select(ASSIGNMENT_COLUMNS)
    .order("due_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load assignments"));
  return ((data ?? []) as Raw[]).map(mapAssignment);
}

export async function generateDueChoreAssignments(): Promise<number> {
  const { data, error } = await getAdminInsforge().database.rpc(
    "generate_due_chore_assignments"
  );
  if (error) throw new Error(describeError(error, "Could not generate chores"));
  return toNumber(unwrapRpc(data));
}

export async function completeChoreAssignment(
  assignmentId: string,
  roommateId: string,
  forSomeoneElse = false
): Promise<void> {
  const { data, error: loadError } = await getAdminInsforge()
    .database.from("chore_assignments")
    .select("id, assigned_to, status")
    .eq("id", assignmentId)
    .limit(1);
  if (loadError || !data?.[0]) {
    throw new Error(describeError(loadError, "Could not complete chore"));
  }
  const assignment = data[0] as { assigned_to: string; status: string };
  if (assignment.assigned_to !== roommateId && !forSomeoneElse) {
    throw new Error("Only the assigned roommate can complete this. Mark it as completing for them if needed.");
  }

  const { error } = await getAdminInsforge().database.rpc("complete_chore_assignment", {
    p_assignment_id: assignmentId,
    p_roommate_id: roommateId,
  });
  if (error) throw new Error(describeError(error, "Could not complete chore"));
}

export async function createChore(input: {
  name: string;
  description: string | null;
  points?: number;
  frequency?: ChoreFrequency;
  createdBy: string;
  roommateIds: string[];
}): Promise<string> {
  if (input.roommateIds.length < 1) {
    throw new Error("Choose at least one roommate for the rotation");
  }

  const { data, error } = await getAdminInsforge().database.rpc("create_chore_with_rotation", {
    p_name: input.name,
    p_description: input.description,
    p_points: input.points ?? 10,
    p_frequency: input.frequency ?? "weekly",
    p_created_by: input.createdBy,
    p_roommate_ids: input.roommateIds,
  });

  if (error) throw new Error(describeError(error, "Could not create chore"));
  const id = Array.isArray(data) ? data[0] : data;
  if (!id) throw new Error("Could not create chore");
  return String(id);
}

export async function updateChore(input: {
  id: string;
  name: string;
  description: string | null;
  points?: number;
  frequency?: ChoreFrequency;
  roommateIds: string[];
}): Promise<void> {
  if (input.roommateIds.length < 1) {
    throw new Error("Choose at least one roommate for the rotation");
  }
  const { error } = await getAdminInsforge().database.rpc("update_chore_with_rotation", {
    p_id: input.id,
    p_name: input.name,
    p_description: input.description,
    p_points: input.points ?? 10,
    p_frequency: input.frequency ?? "weekly",
    p_roommate_ids: input.roommateIds,
  });
  if (error) throw new Error(describeError(error, "Could not update chore"));
}

function mapSwap(row: Raw): import("@/types/database").ChoreSwapRequest {
  const status = String(row.status);
  return {
    id: String(row.id),
    assignment_id: String(row.assignment_id),
    from_roommate_id: String(row.from_roommate_id),
    to_roommate_id: String(row.to_roommate_id),
    status:
      status === "accepted" || status === "declined" || status === "cancelled"
        ? status
        : "pending",
    created_at: String(row.created_at),
  };
}

export async function listPendingSwaps(): Promise<import("@/types/database").ChoreSwapRequest[]> {
  const { data, error } = await getAdminInsforge()
    .database.from("chore_swap_requests")
    .select("id, assignment_id, from_roommate_id, to_roommate_id, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(describeError(error, "Could not load swaps"));
  return ((data ?? []) as Raw[]).map(mapSwap);
}

export async function requestChoreSwap(assignmentId: string, fromId: string, toId: string) {
  const { error } = await getAdminInsforge().database.rpc("request_chore_swap", {
    p_assignment_id: assignmentId,
    p_from: fromId,
    p_to: toId,
  });
  if (error) throw new Error(describeError(error, "Could not request a swap"));
}

export async function respondChoreSwap(id: string, actorId: string, accept: boolean) {
  const { error } = await getAdminInsforge().database.rpc("respond_chore_swap", {
    p_id: id,
    p_actor: actorId,
    p_accept: accept,
  });
  if (error) throw new Error(describeError(error, "Could not answer that swap"));
}

export async function seedDefaultChores(
  createdBy: string,
  roommateIds: string[]
): Promise<void> {
  for (const chore of DEFAULT_CHORES) {
    await createChore({
      name: chore.name,
      description: chore.description,
      createdBy,
      roommateIds,
    });
  }
}

export function statusTone(
  status: ChoreStatus
): "neutral" | "good" | "warn" | "bad" {
  if (status === "completed") return "good";
  if (status === "missed") return "bad";
  if (status === "skipped") return "warn";
  return "neutral";
}
