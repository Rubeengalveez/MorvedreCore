import type { NextRequest } from "next/server";

const LOCAL_HOST_PATTERN =
  /^(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?$/;

function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

export function getAppOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? null;
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost ?? firstHeaderValue(request.headers.get("host"));
  const forwardedProtocol = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const protocol = forwardedProtocol === "https" ? "https" : "http";

  if (process.env.NODE_ENV !== "production" && host && LOCAL_HOST_PATTERN.test(host)) {
    return `${protocol}://${host}`;
  }

  const requestOrigin = request.nextUrl.origin;
  if (!request.nextUrl.hostname.match(/^(0\.0\.0\.0|localhost|127\.0\.0\.1)$/)) {
    return requestOrigin;
  }

  return configured ?? requestOrigin;
}
