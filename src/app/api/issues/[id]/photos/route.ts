import { handle, HttpError, jsonOk, requireSession, routeId } from "@/lib/server/http";
import { listAttachments, uploadConcernPhoto } from "@/lib/server/issues";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await listAttachments(await routeId(context)));
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Choose a photo");
    return jsonOk(
      await uploadConcernPhoto({
        concernId: await routeId(context),
        roommateId: session.rid,
        file,
      })
    );
  });
}
