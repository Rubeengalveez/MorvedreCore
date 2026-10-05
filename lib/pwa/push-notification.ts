import { getSafeNotificationPath } from "./notification-url";

export function pushNotificationView(value: unknown): {
  title: string;
  options: NotificationOptions & { timestamp?: number };
} {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    title:
      typeof data.title === "string" && data.title.trim()
        ? data.title.slice(0, 100)
        : "Morvedre Core",
    options: {
      body:
        typeof data.body === "string"
          ? data.body.slice(0, 250)
          : "Tienes un nuevo aviso en la app.",
      icon: "/brand/icon-192.png",
      badge: "/brand/notification-badge.png",
      tag: typeof data.tag === "string" ? data.tag.slice(0, 100) : undefined,
      timestamp:
        typeof data.timestamp === "number" && Number.isFinite(data.timestamp)
          ? data.timestamp
          : undefined,
      data: { href: getSafeNotificationPath(data.href) },
    },
  };
}
