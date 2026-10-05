import { getSafeNotificationPath } from "@/lib/pwa/notification-url";

export const NOTIFICATION_TOPICS = [
  { id: "convocatoria", label: "Convocatorias", group: "Deporte" },
  { id: "partidos", label: "Partidos y horarios", group: "Deporte" },
  { id: "entrenamiento_cancelado", label: "Cambios en entrenamientos", group: "Deporte" },
  { id: "asistencia", label: "Ausencias y correcciones", group: "Deporte" },
  { id: "resultado_publicado", label: "Resultados de partidos", group: "Deporte" },
  { id: "pedido_pendiente", label: "Pedidos de tienda", group: "Club" },
  { id: "noticia_fijada", label: "Noticias del club", group: "Club" },
  { id: "cierre_mensual", label: "Cuotas y pagos", group: "Club" },
  { id: "solicitudes_acceso", label: "Solicitudes de acceso", group: "Administración" },
] as const;

export type NotificationTopic = (typeof NOTIFICATION_TOPICS)[number]["id"];
export type NotificationPreferences = Record<NotificationTopic, boolean>;

const KIND_TOPICS: Record<string, NotificationTopic> = {
  convocatoria: "convocatoria",
  match_created: "partidos",
  match_changed: "partidos",
  match_cancelled: "partidos",
  match_reminder: "partidos",
  training_cancelled: "entrenamiento_cancelado",
  training_changed: "entrenamiento_cancelado",
  training_absence: "asistencia",
  training_attendance_corrected: "asistencia",
  news_pinned: "noticia_fijada",
  shop_order: "pedido_pendiente",
  result_published: "resultado_publicado",
  monthly_close: "cierre_mensual",
  access_request: "solicitudes_acceso",
};

export function notificationTopic(kind: string, href?: string | null): NotificationTopic | null {
  if (kind === "news_pinned" && href?.startsWith("/shop/orders/")) return "pedido_pendiente";
  return KIND_TOPICS[kind] ?? null;
}

export function notificationPreferences(
  rows: Array<{ notification_type: string; enabled: boolean }>,
): NotificationPreferences {
  return Object.fromEntries(
    NOTIFICATION_TOPICS.map((topic) => [
      topic.id,
      rows.find((row) => row.notification_type === topic.id)?.enabled ?? true,
    ]),
  ) as NotificationPreferences;
}

export function notificationPresentation(kind: string, href?: string | null) {
  const topic = notificationTopic(kind, href);
  const label = NOTIFICATION_TOPICS.find((item) => item.id === topic)?.label ?? "Aviso del club";
  const labels: Record<string, string> = {
    convocatoria: "Convocatoria",
    match_created: "Nuevo partido",
    match_changed: "Partido actualizado",
    match_cancelled: "Partido cancelado",
    match_reminder: "Próximo partido",
    training_cancelled: "Entrenamiento cancelado",
    training_changed: "Entrenamiento actualizado",
    training_absence: "Ausencia registrada",
    training_attendance_corrected: "Asistencia corregida",
    news_pinned: "Noticia",
    shop_order: "Pedido de tienda",
    result_published: "Resultado",
    monthly_close: "Cuotas y pagos",
    access_request: "Solicitud de acceso",
  };
  return {
    topic,
    label: topic === "pedido_pendiente" ? "Pedido de tienda" : (labels[kind] ?? label),
    attention: ["training_absence", "training_cancelled", "match_cancelled"].includes(kind),
  };
}

export function notificationTarget(item: {
  href: string | null;
  kind: string;
  related_match_id?: string | null;
}): string | null {
  if (item.related_match_id && /^[\da-f-]{36}$/i.test(item.related_match_id))
    return `/matches/${item.related_match_id}`;
  if (!item.href) return item.kind === "training_cancelled" ? "/calendar" : null;
  const path = getSafeNotificationPath(item.href);
  if (path === "/notifications" && item.href !== path) return null;
  const url = new URL(path, "https://morvedre.invalid");
  const allowed =
    /^\/(?:news\/[\da-f-]{36}|matches\/[\da-f-]{36}|shop\/orders(?:\/[\da-f-]{36})?|shop\/parents\/pending|attendance\/history|calendar|treasury|admin\/(?:access-requests|shop)|notifications)$/i;
  return allowed.test(url.pathname) ? path : null;
}

export function notificationTargetLabel(target: string): string {
  if (target.startsWith("/matches/")) return "Ver partido";
  if (target.startsWith("/attendance/")) return "Ver asistencia";
  if (target.startsWith("/shop/")) return "Ver pedido";
  if (target.startsWith("/news/")) return "Ver noticia";
  if (target.startsWith("/treasury")) return "Ver cuotas y pagos";
  if (target.startsWith("/admin/shop")) return "Ver pedidos";
  if (target.startsWith("/admin/")) return "Revisar solicitud";
  return "Ver calendario";
}

export function notificationPushPayload(item: {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  created_at: string;
}) {
  return {
    title: item.title.slice(0, 100),
    body: (item.body ?? "").replace(/\s+/g, " ").slice(0, 250),
    href: `/notifications/${item.id}`,
    tag: `morvedre-${item.id}`,
    timestamp: Date.parse(item.created_at),
    ttl: item.kind === "match_reminder" ? 3600 : 86400,
  };
}

export function notificationBackTarget(from?: string, id?: string) {
  return from === "notification" &&
    id &&
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)
    ? { href: `/notifications/${id}`, label: "Volver al aviso" }
    : null;
}
