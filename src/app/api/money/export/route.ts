import { handle, requireSession } from "@/lib/server/http";
import { expensesCsv } from "@/lib/server/expenses";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    const csv = await expensesCsv();
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=roomos-expenses.csv",
      },
    });
  });
}
