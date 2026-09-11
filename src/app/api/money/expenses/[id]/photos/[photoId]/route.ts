import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, HttpError, requireSession } from "@/lib/server/http";
import { downloadExpensePhoto, getExpenseAttachment } from "@/lib/server/expenses";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; photoId: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    const { id, photoId } = await context.params;
    if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(photoId).success) {
      throw new HttpError(400, "That receipt was not found");
    }
    const attachment = await getExpenseAttachment(id, photoId);
    const blob = await downloadExpensePhoto(attachment.storage_path);
    return new NextResponse(blob, {
      headers: {
        "Content-Type": blob.type || "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  });
}
