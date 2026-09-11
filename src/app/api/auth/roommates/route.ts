import { handle, jsonOk, listActiveRoommates } from "@/lib/server/http";

export async function GET(request: Request) {
  return handle(
    request,
    async () => jsonOk(await listActiveRoommates()),
    { origin: false }
  );
}
