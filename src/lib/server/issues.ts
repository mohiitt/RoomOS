import "server-only";
import { getAdminInsforge } from "@/lib/insforge/admin";
import { describeError } from "@/lib/insforge/errors";
import {
  CONCERN_PHOTOS_BUCKET,
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
  const { data, error } = await getAdminInsforge()
    .database.from("concerns")
    .select(CONCERN_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load issues"));
  return ((data ?? []) as Raw[]).map(mapConcern);
}

export async function countOpenConcerns(): Promise<number> {
  const { data, error } = await getAdminInsforge()
    .database.from("concerns")
    .select("id, status")
    .neq("status", "resolved")
    .limit(200);

  if (error) throw new Error(describeError(error, "Could not load issue count"));
  return (data ?? []).length;
}

export async function getConcern(id: string): Promise<Concern> {
  const { data, error } = await getAdminInsforge()
    .database.from("concerns")
    .select(CONCERN_COLUMNS)
    .eq("id", id)
    .single();

  if (error || !data) throw new Error(describeError(error, "Could not load this issue"));
  return mapConcern(data as Raw);
}

export async function listComments(concernId: string): Promise<ConcernComment[]> {
  const { data, error } = await getAdminInsforge()
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
  const { data, error } = await getAdminInsforge()
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
  const { data, error } = await getAdminInsforge().database.rpc("create_concern", {
    p_title: input.title,
    p_description: input.description,
    p_priority: input.priority,
    p_reported_by: input.reportedBy,
    p_assigned_to: input.assignedTo,
  });

  if (error) throw new Error(describeError(error, "Could not report issue"));
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Could not report issue");
  return mapConcern(row as Raw);
}

export async function updateConcern(
  id: string,
  patch: {
    status?: ConcernStatus;
    assignedTo?: string | null;
    priority?: ConcernPriority;
    actorId: string;
  }
): Promise<Concern> {
  const { data, error } = await getAdminInsforge().database.rpc("update_concern", {
    p_id: id,
    p_status: patch.status ?? null,
    p_assigned_to: patch.assignedTo ?? null,
    p_clear_assignee: patch.assignedTo === null,
    p_priority: patch.priority ?? null,
    p_actor_id: patch.actorId,
  });

  if (error) throw new Error(describeError(error, "Could not update issue"));
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Could not update issue");
  return mapConcern(row as Raw);
}

export async function addComment(input: {
  concernId: string;
  roommateId: string;
  comment: string;
}): Promise<ConcernComment> {
  const { data, error } = await getAdminInsforge().database.rpc("add_concern_comment", {
    p_concern_id: input.concernId,
    p_roommate_id: input.roommateId,
    p_comment: input.comment,
  });

  if (error) throw new Error(describeError(error, "Could not add comment"));
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Could not add comment");
  return mapComment(row as Raw);
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

const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

async function removePhotoBlob(path: string) {
  await getAdminInsforge().storage.from(CONCERN_PHOTOS_BUCKET).remove(path).catch(() => undefined);
}

export async function getConcernAttachment(
  concernId: string,
  attachmentId: string
): Promise<ConcernAttachment> {
  const { data, error } = await getAdminInsforge()
    .database.from("concern_attachments")
    .select(ATTACHMENT_COLUMNS)
    .eq("id", attachmentId)
    .eq("concern_id", concernId)
    .limit(1);

  if (error || !data?.[0]) throw new Error(describeError(error, "Could not load photo"));
  return mapAttachment(data[0] as Raw);
}

export async function downloadConcernPhoto(path: string): Promise<Blob> {
  const { data, error } = await getAdminInsforge()
    .storage.from(CONCERN_PHOTOS_BUCKET)
    .download(path);
  if (error || !data) throw new Error(describeError(error, "Could not load photo"));
  return data as Blob;
}

export async function uploadConcernPhoto(input: {
  concernId: string;
  roommateId: string;
  file: File;
}): Promise<ConcernAttachment> {
  if (input.file.type && !ALLOWED_PHOTO_TYPES.has(input.file.type)) {
    throw new Error("Choose a photo");
  }
  if (input.file.size > 8 * 1024 * 1024) {
    throw new Error("Keep photos under 8 MB");
  }

  const existing = await listAttachments(input.concernId);
  if (existing.length >= 12) {
    throw new Error("This issue already has 12 photos");
  }

  const key = `${input.concernId}/${crypto.randomUUID()}.${extensionFor(input.file)}`;
  const { data: uploaded, error: uploadError } = await getAdminInsforge()
    .storage.from(CONCERN_PHOTOS_BUCKET)
    .upload(key, input.file);

  if (uploadError || !uploaded) {
    throw new Error(describeError(uploadError, "Could not upload photo"));
  }

  const storagePath = String((uploaded as { key?: string }).key ?? key);
  const storageUrl = String((uploaded as { url?: string }).url ?? `/api/issues/${input.concernId}/photos/${storagePath}`);

  const { data, error } = await getAdminInsforge()
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
    await removePhotoBlob(storagePath);
    throw new Error(describeError(error, "Could not save photo"));
  }
  return mapAttachment(data[0] as Raw);
}
