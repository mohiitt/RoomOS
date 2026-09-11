export function describeError(error: unknown, fallback = "Something went wrong") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}

export function isUnsafeErrorMessage(message: string) {
  return /api key|permission denied|jwt|sql|postgres|stack|insforge|secret|hmac/i.test(
    message
  );
}

export function publicErrorMessage(error: unknown, fallback = "Something went wrong") {
  const message = describeError(error, fallback);
  if (isUnsafeErrorMessage(message) || message.length > 140) return fallback;
  return message;
}
