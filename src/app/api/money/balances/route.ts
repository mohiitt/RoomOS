import { handle, jsonOk, requireSession } from "@/lib/server/http";
import { listApartmentBalances } from "@/lib/server/expenses";

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk({ nets: await listApartmentBalances() });
  });
}
