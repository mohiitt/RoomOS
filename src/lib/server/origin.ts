export class OriginError extends Error {
  status = 403;
  constructor(message = "This request did not come from RoomOS") {
    super(message);
    this.name = "OriginError";
  }
}

export function assertSameOrigin(request: Request) {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new OriginError();
    }
    if (!host || originHost !== host) throw new OriginError();
    return;
  }

  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new OriginError();
}
