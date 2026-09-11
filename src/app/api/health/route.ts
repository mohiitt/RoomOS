import { handle, jsonOk } from "@/lib/server/http";

export async function GET(request: Request) {
  return handle(
    request,
    async () =>
      jsonOk({
        ok: true,
        time: new Date().toISOString(),
      }),
    { origin: false }
  );
}
