import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateShopOrderStatus } from "@/server/actions/admin/shop";

const state = vi.hoisted(() => ({
  status: "pending_admin",
  changed: false,
  update: vi.fn(),
  eq: vi.fn(),
  permission: vi.fn().mockResolvedValue({ id: "actor" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/shop-email", () => ({ notifyShopOrder: vi.fn() }));
vi.mock("@/server/actions/admin/notification-dispatch", () => ({
  insertNotificationsWithPush: vi.fn(),
}));
vi.mock("@/server/actions/admin/_helpers", () => ({
  requirePermission: state.permission,
  requireSessionProfile: vi.fn().mockResolvedValue({ id: "actor" }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      let updating = false;
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn((...args: unknown[]) => {
          state.eq(...args);
          return query;
        }),
        update: vi.fn((value: unknown) => {
          updating = true;
          state.update(value);
          return query;
        }),
        maybeSingle: vi.fn(async () => ({
          data: updating ? (state.changed ? null : { id: "updated" }) : { status: state.status },
          error: null,
        })),
      };
      return query;
    },
  }),
}));
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  vi.clearAllMocks();
  state.status = "pending_admin";
  state.changed = false;
  state.permission.mockResolvedValue({ id: "actor" });
});
describe("Acciones de tienda", () => {
  it("no borra notas al entregar y comprueba el estado original", async () => {
    await updateShopOrderStatus({ order_id: id, status: "delivered" });
    expect(state.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "delivered", delivered_at: expect.any(String) }),
    );
    expect(state.update.mock.calls[0][0]).not.toHaveProperty("admin_notes");
    expect(state.eq).toHaveBeenCalledWith("status", "pending_admin");
  });
  it("borra la fecha de entrega al devolver a pendientes", async () => {
    state.status = "delivered";
    await updateShopOrderStatus({ order_id: id, status: "pending_admin" });
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ delivered_at: null }));
  });
  it("bloquea una entrega antes de aprobación de familia", async () => {
    state.status = "pending_parent";
    await expect(updateShopOrderStatus({ order_id: id, status: "delivered" })).rejects.toThrow(
      "familia debe aprobar",
    );
    expect(state.update).not.toHaveBeenCalled();
  });
  it("detecta que otra persona ha cambiado el pedido", async () => {
    state.changed = true;
    await expect(updateShopOrderStatus({ order_id: id, status: "delivered" })).rejects.toThrow(
      "ha cambiado",
    );
  });
  it("verifica permisos antes de cualquier escritura", async () => {
    state.permission.mockRejectedValue(new Error("Sin permisos"));
    await expect(updateShopOrderStatus({ order_id: id, status: "delivered" })).rejects.toThrow(
      "Sin permisos",
    );
    expect(state.update).not.toHaveBeenCalled();
  });
});

vi.mock("@/server/notification-push", () => ({ scheduleNotificationPush: vi.fn() }));
