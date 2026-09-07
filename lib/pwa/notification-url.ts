const NOTIFICATION_ORIGIN = "https://morvedre.invalid";

export function getSafeNotificationPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/notifications";
  }

  try {
    const url = new URL(value, NOTIFICATION_ORIGIN);
    if (url.origin !== NOTIFICATION_ORIGIN) return "/notifications";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/notifications";
  }
}
