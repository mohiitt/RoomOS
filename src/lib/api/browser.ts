export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  if (
    typeof navigator !== "undefined" &&
    navigator.onLine === false &&
    method !== "GET" &&
    method !== "HEAD"
  ) {
    throw new Error("You're offline. Connect to save changes.");
  }

  const headers = new Headers(init?.headers);
  const body = init?.body;
  if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | T | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Something went wrong";
    throw new Error(message);
  }
  return payload as T;
}
