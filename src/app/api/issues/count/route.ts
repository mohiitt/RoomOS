import { handle, jsonOk, requireSession } from "@/lib/server/http";
import { countOpenConcerns } from "@/lib/server/issues";

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk({ count: await countOpenConcerns() });
  });
}
