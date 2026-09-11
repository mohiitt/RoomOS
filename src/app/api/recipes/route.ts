import { z } from "zod";
import { handle, jsonOk, readJson, requireSession } from "@/lib/server/http";
import { createRecipe, listRecipes } from "@/lib/server/recipes";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  instructions: z.string().trim().min(1).max(4000),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        quantity: z.string().trim().min(1).max(40),
        unit: z.string().max(24),
      })
    )
    .min(1),
});

export async function GET(request: Request) {
  return handle(request, async () => {
    await requireSession(request);
    return jsonOk(await listRecipes());
  });
}

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request);
    const input = await readJson(request, schema);
    return jsonOk(
      await createRecipe({
        ...input,
        createdBy: session.rid,
      })
    );
  });
}
