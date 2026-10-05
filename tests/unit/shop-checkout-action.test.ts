import { beforeEach, describe, expect, it, vi } from "vitest";
import { createShopOrder } from "@/server/actions/admin/shop";
const state = vi.hoisted(() => ({ rpc: vi.fn(), notify: vi.fn(), session: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/actions/admin/_helpers", () => ({
  requireSessionProfile: state.session,
  requirePermission: vi.fn(),
}));
vi.mock("@/server/shop-email", () => ({ notifyShopOrder: state.notify }));
vi.mock("@/server/actions/admin/notification-dispatch", () => ({
  insertNotificationsWithPush: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: state.rpc,
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        single: async () => ({ data: { status: "pending_admin" }, error: null }),
      };
      return query;
    },
  }),
}));
const id = "11111111-1111-4111-8111-111111111111";
const input = {
  checkout_key: id,
  expected_total_cents: 1000,
  items: [{ product_id: id, size: null, personalization: null, quantity: 2 }],
  contact_phone: "612345678",
};
beforeEach(() => {
  vi.clearAllMocks();
  state.session.mockResolvedValue({ id: "session-profile" });
  state.rpc.mockResolvedValue({
    data: { id, order_reference: "02102026A", created: true },
    error: null,
  });
});
describe("Confirmación segura de tienda", () => {
  it("la identidad sale de la sesión, nunca del carrito", async () => {
    await createShopOrder(input);
    expect(state.rpc).toHaveBeenCalledWith(
      "submit_shop_checkout",
      expect.objectContaining({
        p_requester: "session-profile",
        p_expected_total: 1000,
        p_checkout_key: id,
        p_contact_phone: "+34612345678",
        p_items: input.items,
      }),
    );
  });
  it("un reintento ya guardado devuelve el comprobante sin repetir avisos", async () => {
    state.rpc.mockResolvedValue({
      data: { id, order_reference: "02102026A", created: false },
      error: null,
    });
    expect(await createShopOrder(input)).toEqual({ id, order_reference: "02102026A" });
    expect(state.notify).not.toHaveBeenCalled();
  });
  it("un cambio de precio se comunica y no se notifica un pedido", async () => {
    state.rpc.mockResolvedValue({ error: { message: "El precio ha cambiado" }, data: null });
    await expect(createShopOrder(input)).rejects.toThrow("precio ha cambiado");
    expect(state.notify).not.toHaveBeenCalled();
  });
  it("validación inválida no llega a base de datos", async () => {
    await expect(
      createShopOrder({ ...input, items: [{ ...input.items[0], quantity: 0 }] }),
    ).rejects.toThrow();
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("sin sesión no llega a base de datos", async () => {
    state.session.mockRejectedValue(new Error("Sin sesión"));
    await expect(createShopOrder(input)).rejects.toThrow("Sin sesión");
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("un error de aviso posterior no presenta el pedido guardado como fallido", async () => {
    state.notify.mockRejectedValue(new Error("Correo no disponible"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await createShopOrder(input)).toEqual({ id, order_reference: "02102026A" });
    log.mockRestore();
  });
});

vi.mock("@/server/notification-push", () => ({ scheduleNotificationPush: vi.fn() }));
