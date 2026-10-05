import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { sendMonthlyShopReminder, notifyShopOrder } from "@/server/shop-email";
import { shopOrderFixture } from "../fixtures/shop-management";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  load: vi.fn(),
  entries: new Map<string, Record<string, unknown>>(),
}));
vi.mock("@/server/queries/admin-shop", () => ({ loadShopManagementOrders: mocks.load }));
vi.mock("@/lib/domain/shop-orders-pdf", () => ({
  createShopOrdersPdf: () => new Uint8Array([37, 80, 68, 70]),
}));
vi.mock("@/lib/email/resend", () => ({ sendEmail: mocks.send }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const filters: Record<string, unknown> = {};
      let patch: Record<string, unknown> | null = null;
      const row = () => mocks.entries.get(`${filters.event_key}:${filters.recipient}`);
      const apply = () => {
        const existing = row();
        if (existing && patch) {
          Object.assign(existing, patch);
          return { data: existing, error: null };
        }
        return { data: null, error: null };
      };
      const chain = {
        select: () => chain,
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return chain;
        },
        neq: () => chain,
        update: (value: Record<string, unknown>) => {
          patch = value;
          return chain;
        },
        insert: async (value: Record<string, unknown>) => {
          const key = `${value.event_key}:${value.recipient}`;
          if (mocks.entries.has(key)) return { error: { code: "23505" } };
          mocks.entries.set(key, { ...value, sent_at: null });
          return { error: null };
        },
        single: async () => ({ data: row(), error: null }),
        maybeSingle: async () => apply(),
        then: (
          resolve: (result: { data: Record<string, unknown> | null; error: null }) => unknown,
        ) => Promise.resolve(apply()).then(resolve),
      };
      return chain;
    },
  }),
}));

beforeEach(() => {
  mocks.entries.clear();
  mocks.send.mockReset().mockResolvedValue({ success: true });
  mocks.load.mockReset().mockResolvedValue([shopOrderFixture]);
  vi.stubEnv("SHOP_MANAGER_EMAIL", "galvillo9@gmail.com");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("Correos de tienda", () => {
  it("no envía recordatorios fuera del día 1", async () => {
    await sendMonthlyShopReminder(new Date("2026-10-02T08:00:00Z"));
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("adjunta el PDF y evita enviar dos veces el mismo mes", async () => {
    expect(await sendMonthlyShopReminder(new Date("2026-10-01T08:00:00Z"))).toEqual({
      sent: true,
      orders: 1,
    });
    await sendMonthlyShopReminder(new Date("2026-10-01T09:00:00Z"));
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "galvillo9@gmail.com",
        attachments: [{ filename: "pedidos-pendientes-2026-10.pdf", content: "JVBERg==" }],
        idempotencyKey: expect.any(String),
      }),
    );
    expect([...mocks.entries.values()][0].payload).toBeNull();
  });
  it("no envía un PDF vacío", async () => {
    mocks.load.mockResolvedValue([]);
    await sendMonthlyShopReminder(new Date("2026-10-01T08:00:00Z"));
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("permite reintentar un fallo conservando la primera versión del mensaje", async () => {
    mocks.send.mockResolvedValueOnce({ success: false }).mockResolvedValue({ success: true });
    await sendMonthlyShopReminder(new Date("2026-10-01T08:00:00Z"));
    mocks.load.mockResolvedValue([shopOrderFixture, shopOrderFixture]);
    await sendMonthlyShopReminder(new Date("2026-10-01T09:00:00Z"));
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.send.mock.calls[0][0]).toEqual(mocks.send.mock.calls[1][0]);
  });
  it("el correo de un pedido no adjunta el PDF mensual", async () => {
    await notifyShopOrder(shopOrderFixture.id);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send.mock.calls[0][0]).not.toHaveProperty("attachments");
  });
  it("un fallo de correo no hace fallar el pedido que ya está guardado", async () => {
    mocks.send.mockRejectedValue(new Error("Proveedor no disponible"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(notifyShopOrder(shopOrderFixture.id)).resolves.toBeUndefined();
  });
});
