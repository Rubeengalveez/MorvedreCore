import { describe, expect, it } from "vitest";
import {
  isActiveShopOrder,
  matchesShopSearch,
  selectPdfOrders,
  shopAgeCategory,
} from "@/lib/domain/shop-management";
import { createShopOrdersPdf } from "@/lib/domain/shop-orders-pdf";
import { shopOrderEmail } from "@/lib/email/shop-order";
import { shopReminderMonth } from "@/server/shop-email";
import { shopOrderFixture } from "../fixtures/shop-management";

describe("Gestión sencilla de tienda", () => {
  it("agrupa estados antiguos en pendientes y excluye la aprobación familiar", () => {
    for (const status of ["pending_admin", "ordered", "received"] as const)
      expect(isActiveShopOrder({ status })).toBe(true);
    for (const status of ["pending_parent", "delivered", "rejected", "cancelled"] as const)
      expect(isActiveShopOrder({ status })).toBe(false);
  });
  it("muestra Cadete por edad aunque el jugador juegue con Absoluto", () => {
    expect(shopAgeCategory(2010, 2026)).toBe("Juvenil");
    expect(shopAgeCategory(null, 2026)).toBeNull();
  });
  it("busca varios términos sin diferencias de acentos o mayúsculas", () => {
    expect(matchesShopSearch("Lucía · Alevín · Bañador", "alevin lucia")).toBe(true);
    expect(matchesShopSearch("Lucía · Alevín", "cadete")).toBe(false);
  });
  it("exporta activos, valida selección vacía y detecta pedidos que se han entregado", () => {
    const delivered = {
      ...shopOrderFixture,
      id: "55555555-5555-4555-8555-555555555555",
      status: "delivered" as const,
    };
    expect(selectPdfOrders([shopOrderFixture, delivered])).toEqual([shopOrderFixture]);
    expect(selectPdfOrders([shopOrderFixture], [shopOrderFixture.id])).toHaveLength(1);
    expect(() => selectPdfOrders([shopOrderFixture], [])).toThrow("Selecciona");
    expect(() => selectPdfOrders([delivered], [delivered.id])).toThrow("ya no está pendiente");
  });
  it("genera un PDF real y no incluye entregados ni solicitudes familiares", () => {
    const pdf = createShopOrdersPdf(
      [
        shopOrderFixture,
        { ...shopOrderFixture, requested_by_name: "NO INCLUIR", status: "delivered" },
      ],
      new Date("2026-10-01T08:00:00Z"),
    );
    const bytes = new TextDecoder().decode(pdf);
    expect(bytes.startsWith("%PDF-")).toBe(true);
    expect(bytes).toContain("Juan Pepe Marco");
    expect(bytes).not.toContain("NO INCLUIR");
    const many = createShopOrdersPdf(Array.from({ length: 20 }, () => shopOrderFixture));
    expect(new TextDecoder().decode(many).match(/\/Type \/Page\b/g)?.length).toBeGreaterThan(1);
    const longOrder = createShopOrdersPdf([
      { ...shopOrderFixture, items: Array.from({ length: 45 }, () => shopOrderFixture.items[0]) },
    ]);
    expect(new TextDecoder().decode(longOrder)).toContain("CONTINUACI");
  });
  it("el correo muestra detalle, familia y escapa contenido del usuario", () => {
    const email = shopOrderEmail(
      {
        ...shopOrderFixture,
        requested_by_name: "Juan <script>x</script>",
        approved_by_name: "Amaya López",
        guardian_email: "familia@example.com",
      },
      "https://core.example/admin/shop",
    );
    expect(email.text).toContain("Categoría: Cadete");
    expect(email.text).toContain("Talla XL");
    expect(email.text).toContain("Nombre: JUAN");
    expect(email.text).toContain("Amaya López");
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
  it("programa el día 1 según Madrid y no según la fecha UTC", () => {
    expect(shopReminderMonth(new Date("2026-09-30T22:30:00Z"))).toBe("2026-10");
    expect(shopReminderMonth(new Date("2026-10-02T08:00:00Z"))).toBeNull();
  });
});
