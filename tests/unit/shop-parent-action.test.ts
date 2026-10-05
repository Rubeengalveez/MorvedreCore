import { beforeEach, describe, expect, it, vi } from "vitest";
import { decideShopOrder } from "@/server/actions/admin/shop";
const state = vi.hoisted(() => ({
  linked: true,
  changed: false,
  update: vi.fn(),
  notify: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/actions/admin/_helpers", () => ({
  requireSessionProfile: async () => ({ id: "parent" }),
  requirePermission: vi.fn(),
}));
vi.mock("@/server/shop-email", () => ({ notifyShopOrder: state.notify }));
vi.mock("@/server/actions/admin/notification-dispatch", () => ({
  insertNotificationsWithPush: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          data:
            table === "shop_orders"
              ? { requested_by: "child", status: "pending_parent" }
              : table === "profiles"
                ? { birth_year: 1980 }
                : state.linked
                  ? { parent_profile_id: "parent" }
                  : null,
          error: null,
        }),
      };
      return query;
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      let writing = false;
      const query = {
        select: () => query,
        eq: () => query,
        update: (value: unknown) => {
          writing = true;
          state.update(table, value);
          return query;
        },
        maybeSingle: async () => ({
          data: writing ? (state.changed ? null : { id: "order" }) : { phone_e164: "+34611111111" },
          error: null,
        }),
      };
      return query;
    },
  }),
}));
const input = {
  order_id: "11111111-1111-4111-8111-111111111111",
  decision: "approve" as const,
  contact_phone: "622222222",
};
beforeEach(() => {
  vi.clearAllMocks();
  state.linked = true;
  state.changed = false;
  state.notify.mockResolvedValue(undefined);
});
describe("Aprobación familiar", () => {
  it("guarda el contacto elegido y no sustituye un teléfono de perfil existente", async () => {
    await decideShopOrder(input);
    expect(state.update).toHaveBeenCalledOnce();
    expect(state.update).toHaveBeenCalledWith(
      "shop_orders",
      expect.objectContaining({
        status: "pending_admin",
        approved_by: "parent",
        contact_phone_e164: "+34622222222",
      }),
    );
    expect(state.notify).toHaveBeenCalledOnce();
  });
  it("no permite que decida otra familia", async () => {
    state.linked = false;
    await expect(decideShopOrder(input)).rejects.toThrow("Solo su familia");
    expect(state.update).not.toHaveBeenCalled();
  });
  it("no sobrescribe una decisión concurrente", async () => {
    state.changed = true;
    await expect(decideShopOrder(input)).rejects.toThrow("ya lo ha decidido");
    expect(state.notify).not.toHaveBeenCalled();
  });
  it("un aviso fallido no presenta una aprobación guardada como fallida", async () => {
    state.notify.mockRejectedValue(new Error("sin correo"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(decideShopOrder(input)).resolves.toBeUndefined();
    log.mockRestore();
  });
  it("rechazar no envía el pedido a Sol", async () => {
    await decideShopOrder({ ...input, decision: "reject" });
    expect(state.update).toHaveBeenCalledWith(
      "shop_orders",
      expect.objectContaining({ status: "rejected" }),
    );
    expect(state.notify).not.toHaveBeenCalled();
  });
});

vi.mock("@/server/notification-push", () => ({ scheduleNotificationPush: vi.fn() }));
