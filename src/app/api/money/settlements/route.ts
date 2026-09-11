import { z } from "zod";
import { handle, jsonOk, readJson, requireSession } from "@/lib/server/http";
import { pageParams, pageResult } from "@/lib/server/page";
import { createSettlement, listSettlements } from "@/lib/server/expenses";

const schema = z.object({
  payerId: z.string().uuid(),
  receiverId: z.string().uuid(),
  amount: z.number().positive(),
  note: z.string().max(200).nullable(),
});

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    const { limit, offset } = pageParams(request, 20, 50);
    const rows = await listSettlements({ limit: limit + 1, offset });
    return jsonOk(pageResult(rows, limit));
  });
}

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, schema);
    await createSettlement({ ...input, createdBy: session.rid });
    return jsonOk({ ok: true });
  });
}
