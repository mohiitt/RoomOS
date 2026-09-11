export function pageParams(request: Request, fallback = 20, max = 100) {
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? fallback);
  const offsetRaw = Number(url.searchParams.get("offset") ?? 0);
  const limit = Math.min(max, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : fallback));
  const offset = Math.max(0, Number.isFinite(offsetRaw) ? Math.floor(offsetRaw) : 0);
  return { limit, offset };
}

export function pageResult<T>(rows: T[], limit: number) {
  const hasMore = rows.length > limit;
  return { items: hasMore ? rows.slice(0, limit) : rows, hasMore };
}
