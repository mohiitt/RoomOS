import { apiJson } from "@/lib/api/browser";
import type { ConcernPriority, ConcernStatus } from "@/lib/issues/constants.ts";
import type {
  Concern,
  ConcernAttachment,
  ConcernComment,
} from "@/types/database";

export async function listConcerns(): Promise<Concern[]> {
  return apiJson<Concern[]>("/api/issues");
}

export async function countOpenConcerns(): Promise<number> {
  const payload = await apiJson<{ count: number }>("/api/issues/count");
  return payload.count;
}

export async function getConcern(id: string): Promise<Concern> {
  return apiJson<Concern>(`/api/issues/${id}`);
}

export async function listComments(concernId: string): Promise<ConcernComment[]> {
  return apiJson<ConcernComment[]>(`/api/issues/${concernId}/comments`);
}

export async function listAttachments(concernId: string): Promise<ConcernAttachment[]> {
  return apiJson<ConcernAttachment[]>(`/api/issues/${concernId}/photos`);
}

export async function createConcern(input: {
  title: string;
  description: string | null;
  priority: ConcernPriority;
  reportedBy: string;
  assignedTo: string | null;
}): Promise<Concern> {
  return apiJson<Concern>("/api/issues", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateConcern(
  id: string,
  patch: {
    status?: ConcernStatus;
    assignedTo?: string | null;
    priority?: ConcernPriority;
  }
): Promise<Concern> {
  return apiJson<Concern>(`/api/issues/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function addComment(input: {
  concernId: string;
  roommateId: string;
  comment: string;
}): Promise<ConcernComment> {
  return apiJson<ConcernComment>(`/api/issues/${input.concernId}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function uploadConcernPhoto(input: {
  concernId: string;
  roommateId: string;
  file: File;
}): Promise<ConcernAttachment> {
  const body = new FormData();
  body.append("file", input.file);
  body.append("roommateId", input.roommateId);
  return apiJson<ConcernAttachment>(`/api/issues/${input.concernId}/photos`, {
    method: "POST",
    body,
  });
}
