import { describeError, getInsforge } from "@/lib/insforge/client";
import {
  CONCERN_PHOTOS_BUCKET,
  statusOnAssign,
  type ConcernPriority,
  type ConcernStatus,
} from "@/lib/issues/constants.ts";
import type {
  Concern,
  ConcernAttachment,
  ConcernComment,
} from "@/types/database";

type Raw = Record<string, unknown>;

const CONCERN_COLUMNS =
  "id, title, description, priority, status, reported_by, assigned_to, created_at, updated_at, resolved_at";
const COMMENT_COLUMNS = "id, concern_id, roommate_id, comment, created_at";
const ATTACHMENT_COLUMNS =
  "id, concern_id, storage_path, storage_url, uploaded_by, created_at";

function asPriority(value: unknown): ConcernPriority {
  if (value === "low" || value === "high" || value === "urgent") return value;
  return "medium";
}

function asStatus(value: unknown): ConcernStatus {
  if (value === "assigned" || value === "in_progress" || value === "resolved") {
    return value;
  }
  return "open";
}

function mapConcern(row: Raw): Concern {
  return {
    id: String(row.id),
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    priority: asPriority(row.priority),
    status: asStatus(row.status),
    reported_by: (row.reported_by as string | null) ?? null,
    assigned_to: (row.assigned_to as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    resolved_at: (row.resolved_at as string | null) ?? null,
  };
}

function mapComment(row: Raw): ConcernComment {
  return {
    id: String(row.id),
    concern_id: String(row.concern_id),
    roommate_id: (row.roommate_id as string | null) ?? null,
    comment: String(row.comment),
    created_at: String(row.created_at),
  };
}

function mapAttachment(row: Raw): ConcernAttachment {
  return {
    id: String(row.id),
    concern_id: String(row.concern_id),
    storage_path: String(row.storage_path),
    storage_url: String(row.storage_url),
    uploaded_by: (row.uploaded_by as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export async function listConcerns(): Promise<Concern[]> {
  const { data, error } = await getInsforge()
    .database.from("concerns")
    .select(CONCERN_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load issues"));
  return ((data ?? []) as Raw[]).map(mapConcern);
}

export async function countOpenConcerns(): Promise<number> {
  const { data, error } = await getInsforge()
    .database.from("concerns")
    .select("id, status")
    .neq("status", "resolved")
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load issue count"));
  return (data ?? []).length;
}

export async function getConcern(id: string): Promise<Concern> {
  const { data, error } = await getInsforge()
    .database.from("concerns")
    .select(CONCERN_COLUMNS)
    .eq("id", id)
    .single();

  if (error || !data) throw new Error(describeError(error, "Could not load this issue"));
  return mapConcern(data as Raw);
}

export async function listComments(concernId: string): Promise<ConcernComment[]> {
  const { data, error } = await getInsforge()
    .database.from("concern_comments")
    .select(COMMENT_COLUMNS)
    .eq("concern_id", concernId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load comments"));
  return ((data ?? []) as Raw[]).map(mapComment);
}

export async function listAttachments(
  concernId: string
): Promise<ConcernAttachment[]> {
  const { data, error } = await getInsforge()
    .database.from("concern_attachments")
    .select(ATTACHMENT_COLUMNS)
    .eq("concern_id", concernId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) throw new Error(describeError(error, "Could not load photos"));
  return ((data ?? []) as Raw[]).map(mapAttachment);
}

export async function createConcern(input: {
  title: string;
  description: string | null;
  priority: ConcernPriority;
  reportedBy: string;
  assignedTo: string | null;
}): Promise<Concern> {
  const status: ConcernStatus = input.assignedTo ? "assigned" : "open";
  const { data, error } = await getInsforge()
    .database.from("concerns")
    .insert([
      {
        title: input.title,
        description: input.description,
        priority: input.priority,
        status,
        reported_by: input.reportedBy,
        assigned_to: input.assignedTo,
      },
    ])
    .select(CONCERN_COLUMNS);

  if (error || !data?.[0]) {
    throw new Error(describeError(error, "Could not report issue"));
  }
  return mapConcern(data[0] as Raw);
}

export async function updateConcern(
  id: string,
  patch: {
    status?: ConcernStatus;
    assignedTo?: string | null;
    priority?: ConcernPriority;
  }
): Promise<Concern> {
  const current = await getConcern(id);
  const assignedTo =
    patch.assignedTo !== undefined ? patch.assignedTo : current.assigned_to;
  const nextStatus =
    patch.status ?? statusOnAssign(current.status, assignedTo);
  const resolvedAt =
    nextStatus === "resolved"
      ? current.resolved_at ?? new Date().toISOString()
      : null;

  const { data, error } = await getInsforge()
    .database.from("concerns")
    .update({
      status: nextStatus,
      assigned_to: assignedTo,
      priority: patch.priority ?? current.priority,
      resolved_at: resolvedAt,
    })
    .eq("id", id)
    .select(CONCERN_COLUMNS);

  if (error || !data?.[0]) {
    throw new Error(describeError(error, "Could not update issue"));
  }
  return mapConcern(data[0] as Raw);
}

export async function addComment(input: {
  concernId: string;
  roommateId: string;
  comment: string;
}): Promise<ConcernComment> {
  const { data, error } = await getInsforge()
    .database.from("concern_comments")
    .insert([
      {
        concern_id: input.concernId,
        roommate_id: input.roommateId,
        comment: input.comment,
      },
    ])
    .select(COMMENT_COLUMNS);

  if (error || !data?.[0]) {
    throw new Error(describeError(error, "Could not add comment"));
  }
  return mapComment(data[0] as Raw);
}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 5) {
    return fromName;
  }
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic" || file.type === "image/heif") return "heic";
  return "jpg";
}

export async function uploadConcernPhoto(input: {
  concernId: string;
  roommateId: string;
  file: File;
}): Promise<ConcernAttachment> {
  if (!input.file.type.startsWith("image/")) {
    throw new Error("Choose a photo");
  }
  if (input.file.size > 8 * 1024 * 1024) {
    throw new Error("Keep photos under 8 MB");
  }

  const key = `${input.concernId}/${crypto.randomUUID()}.${extensionFor(input.file)}`;
  const { data: uploaded, error: uploadError } = await getInsforge()
    .storage.from(CONCERN_PHOTOS_BUCKET)
    .upload(key, input.file);

  if (uploadError || !uploaded) {
    throw new Error(describeError(uploadError, "Could not upload photo"));
  }

  const storagePath = String(
    (uploaded as { key?: string }).key ?? key
  );
  const storageUrl = String(
    (uploaded as { url?: string }).url ?? ""
  );
  if (!storageUrl) {
    throw new Error("Could not upload photo");
  }

  const { data, error } = await getInsforge()
    .database.from("concern_attachments")
    .insert([
      {
        concern_id: input.concernId,
        storage_path: storagePath,
        storage_url: storageUrl,
        uploaded_by: input.roommateId,
      },
    ])
    .select(ATTACHMENT_COLUMNS);

  if (error || !data?.[0]) {
    throw new Error(describeError(error, "Could not save photo"));
  }
  return mapAttachment(data[0] as Raw);
}
