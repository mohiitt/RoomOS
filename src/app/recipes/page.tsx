import { redirect } from "next/navigation";

export default function RecipesPage() {
  redirect("/inventory?tab=recipes");
}
