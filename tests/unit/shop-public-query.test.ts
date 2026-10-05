import { beforeEach, describe, expect, it, vi } from "vitest";
import { getShopOrdersForProfiles } from "@/server/queries/shop";
const state = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  items: [] as Record<string, unknown>[],
  error: false,
  ranges: vi.fn(),
  filters: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const rows =
        table === "shop_orders" ? state.rows : table === "shop_order_items" ? state.items : [];
      const query = {
        select: () => query,
        in: (column: string, values: unknown) => {
          state.filters(table, column, values);
          return query;
        },
        order: () => query,
        range: async (from: number, to: number) => {
          state.ranges(table, from, to);
          return {
            data: rows.slice(from, to + 1),
            error: state.error ? { message: "offline" } : null,
          };
        },
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: rows, error: null }).then(resolve),
      };
      return query;
    },
  }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.rows = [];
  state.items = [];
  state.error = false;
});
describe("Historial público de tienda", () => {
  it("carga todos los estados y páginas, limitado a los perfiles de la familia", async () => {
    state.rows = Array.from({ length: 501 }, (_, index) => ({
      id: `order-${index}`,
      requested_by: "own",
      status: index ? "pending_parent" : "rejected",
    }));
    const orders = await getShopOrdersForProfiles(["own", "child"]);
    expect(orders).toHaveLength(501);
    expect(orders[0].status).toBe("rejected");
    expect(orders[500].status).toBe("pending_parent");
    expect(state.ranges).toHaveBeenCalledWith("shop_orders", 500, 999);
    expect(state.filters).toHaveBeenCalledWith("shop_orders", "requested_by", ["own", "child"]);
  });
  it("conserva título e importe aunque el producto ya no sea visible", async () => {
    state.rows = [{ id: "order", requested_by: "own", status: "delivered" }];
    state.items = [
      {
        id: "item",
        order_id: "order",
        product_id: "hidden",
        quantity: 2,
        unit_price_cents: 1999,
        subtotal_cents: 3998,
        product_title_snapshot: "Camiseta original",
        product_image_snapshot: null,
      },
    ];
    const orders = await getShopOrdersForProfiles(["own"]);
    expect(orders[0].items[0]).toMatchObject({
      product_title: "Camiseta original",
      unit_price_cents: 1999,
      subtotal_cents: 3998,
      product_image_url: null,
    });
  });
  it("un fallo de carga no se presenta como un historial vacío", async () => {
    state.error = true;
    await expect(getShopOrdersForProfiles(["own"])).rejects.toThrow("Vuelve a intentarlo");
  });
});
