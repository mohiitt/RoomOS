import { describeError, getInsforge } from "@/lib/insforge/client";
import type { Roommate } from "@/types/database";

export async function listRoommates(): Promise<Roommate[]> {
  const { data, error } = await getInsforge()
    .database.from("roommates")
    .select("id, name, avatar_url, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) throw new Error(describeError(error, "Could not load roommates"));
  return (data ?? []) as Roommate[];
}
