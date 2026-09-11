import { redirect } from "next/navigation";

// Intentionally unused: the AI assistant is out of scope. Keep the route so old links don't 404.
export default function AssistantPage() {
  redirect("/");
}
