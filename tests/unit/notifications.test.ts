import { describe, expect, it } from "vitest";
import {
  notificationBackTarget,
  notificationPreferences,
  notificationPresentation,
  notificationPushPayload,
  notificationTarget,
  notificationTopic,
} from "@/lib/domain/notifications";
import {
  isAllowedPushEndpoint,
  pushRequestIsSameOrigin,
  validPushKey,
} from "@/lib/domain/push-subscription";
import { pushNotificationView } from "@/lib/pwa/push-notification";

describe("Avisos y preferencias", () => {
  it("conserva preferencias independientes y activa las nuevas por defecto", () => {
    const prefs = notificationPreferences([{ notification_type: "asistencia", enabled: false }]);
    expect(prefs.asistencia).toBe(false);
    expect(prefs.convocatoria).toBe(true);
    expect(notificationTopic("training_attendance_corrected")).toBe("asistencia");
  });
  it("clasifica los avisos antiguos de tienda sin confundirlos con noticias", () => {
    expect(notificationTopic("news_pinned", "/shop/orders/abc")).toBe("pedido_pendiente");
    expect(notificationPresentation("news_pinned", "/shop/orders/abc").label).toBe(
      "Pedido de tienda",
    );
  });
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/calendarevil",
    "/admin/players",
    "/api/anything",
  ])("bloquea destinos ajenos o no admitidos: %s", (href) => {
    expect(notificationTarget({ kind: "unknown", href })).toBeNull();
  });
  it("admite cuotas, asistencia y solicitudes con un destino concreto", () => {
    expect(notificationTarget({ kind: "monthly_close", href: "/treasury" })).toBe("/treasury");
    expect(notificationTarget({ kind: "access_request", href: "/admin/access-requests" })).toBe(
      "/admin/access-requests",
    );
  });
  it("lleva cada push a su propio aviso con una vigencia corta", () => {
    const payload = notificationPushPayload({
      id: "notice",
      title: "Convocatoria",
      body: "Morvedre\ncontra Turia",
      kind: "match_reminder",
      created_at: "2026-10-03T10:00:00Z",
    });
    expect(payload).toMatchObject({
      href: "/notifications/notice",
      tag: "morvedre-notice",
      body: "Morvedre contra Turia",
      ttl: 3600,
    });
  });
  it("solo devuelve un origen de notificación validado", () => {
    expect(
      notificationBackTarget("notification", "11111111-1111-4111-8111-111111111111")?.label,
    ).toBe("Volver al aviso");
    expect(notificationBackTarget("notification", "//evil.test")).toBeNull();
  });
});

describe("Push seguro y presentación nativa", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/key",
    "https://updates.push.services.mozilla.com/wpush/v2/key",
    "https://web.push.apple.com/key",
    "https://wns2.notify.windows.com/key",
  ])("admite el proveedor %s", (endpoint) => expect(isAllowedPushEndpoint(endpoint)).toBe(true));
  it.each([
    "http://fcm.googleapis.com/key",
    "https://localhost/key",
    "https://127.0.0.1/key",
    "https://fcm.googleapis.com.evil.test/key",
    "https://user:pass@fcm.googleapis.com/key",
    "https://fcm.googleapis.com:8443/key",
  ])("rechaza el destino %s", (endpoint) => expect(isAllowedPushEndpoint(endpoint)).toBe(false));
  it("valida las longitudes reales de las claves", () => {
    expect(validPushKey(Buffer.alloc(65, 4).toString("base64url"), 65)).toBe(true);
    expect(validPushKey("garbage", 65)).toBe(false);
    expect(validPushKey(Buffer.alloc(16, 1).toString("base64url"), 16)).toBe(true);
  });
  it("rechaza solicitudes de otro origen", () =>
    expect(
      pushRequestIsSameOrigin(
        new Request("https://core.test/api/push/test", {
          headers: { origin: "https://evil.test" },
        }),
      ),
    ).toBe(false));
  it("mantiene icono, etiqueta y destino seguro sin aceptar un payload mal formado", () => {
    expect(
      pushNotificationView({ title: "Gol", body: "Resultado", tag: "id", href: "//evil.test" }),
    ).toMatchObject({
      title: "Gol",
      options: {
        icon: "/brand/icon-192.png",
        badge: "/brand/notification-badge.png",
        tag: "id",
        data: { href: "/notifications" },
      },
    });
    expect(pushNotificationView(null).title).toBe("Morvedre Core");
  });
});
