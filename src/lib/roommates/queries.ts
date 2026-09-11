import { apiJson } from "@/lib/api/browser";
import type { Roommate } from "@/types/database";

export async function listRoommates(): Promise<Roommate[]> {
  return apiJson<Roommate[]>("/api/auth/roommates");
}

export async function fetchSession() {
  return apiJson<{ unlocked: boolean; roommateId: string | null }>("/api/auth/session");
}

export async function switchSessionRoommate(roommateId: string) {
  return apiJson<{ ok: true; roommateId: string }>("/api/auth/roommate", {
    method: "POST",
    body: JSON.stringify({ roommateId }),
  });
}

export async function lockSession() {
  return apiJson<{ ok: true }>("/api/auth/lock", { method: "POST" });
}
