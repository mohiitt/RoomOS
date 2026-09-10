import { describeError, getInsforge } from "@/lib/insforge/client";
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
  const { data, error } = await getInsforge()
    .database.from("chore_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) throw new Error(describeError(error, "Could not load chores"));
  return ((data ?? []) as Raw[]).map(mapTemplate);
}

export async function listChoreRotations(): Promise<ChoreRotation[]> {
  const { data, error } = await getInsforge()
    .database.from("chore_rotations")
    .select(ROTATION_COLUMNS)
    .order("rotation_position", { ascending: true })
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load rotations"));
  return ((data ?? []) as Raw[]).map(mapRotation);
}

export async function listChoreAssignments(): Promise<ChoreAssignment[]> {
  const { data, error } = await getInsforge()
    .database.from("chore_assignments")
    .select(ASSIGNMENT_COLUMNS)
    .order("due_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load assignments"));
  return ((data ?? []) as Raw[]).map(mapAssignment);
}

export async function generateDueChoreAssignments(): Promise<number> {
  const { data, error } = await getInsforge().database.rpc(
    "generate_due_chore_assignments"
  );
  if (error) throw new Error(describeError(error, "Could not generate chores"));
  return toNumber(unwrapRpc(data));
}

export async function completeChoreAssignment(
  assignmentId: string,
  roommateId: string
): Promise<void> {
  const { error } = await getInsforge().database.rpc("complete_chore_assignment", {
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

  const { data, error } = await getInsforge()
    .database.from("chore_templates")
    .insert([
      {
        name: input.name,
        description: input.description,
        frequency: input.frequency ?? "weekly",
        points: input.points ?? 10,
        is_active: true,
        created_by: input.createdBy,
      },
    ])
    .select("id");

  if (error || !data?.[0]) {
    throw new Error(describeError(error, "Could not create chore"));
  }

  const templateId = String((data[0] as Raw).id);
  const { error: rotationError } = await getInsforge()
    .database.from("chore_rotations")
    .insert(
      input.roommateIds.map((roommateId, position) => ({
        chore_template_id: templateId,
        roommate_id: roommateId,
        rotation_position: position,
      }))
    );

  if (rotationError) {
    throw new Error(describeError(rotationError, "Could not save rotation"));
  }

  await generateDueChoreAssignments();
  return templateId;
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
