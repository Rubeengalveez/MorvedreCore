import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/shop/orders/pdf/route";
import { shopOrderFixture } from "../fixtures/shop-management";

const mocks = vi.hoisted(() => ({ permission: vi.fn(), load: vi.fn() }));
vi.mock("@/server/actions/admin/_helpers", () => ({ requirePermission: mocks.permission }));
vi.mock("@/server/queries/admin-shop", () => ({ getShopManagementOrders: mocks.load }));
beforeEach(() => {
  mocks.permission.mockReset().mockResolvedValue({ id: "actor" });
  mocks.load.mockReset().mockResolvedValue([shopOrderFixture]);
});
const request = (body: unknown) =>
  new Request("http://localhost:4184/api/shop/orders/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
describe("Descarga de pedidos", () => {
  it("requiere permisos de tienda", async () => {
    mocks.permission.mockRejectedValue(new Error("Sin permisos"));
    expect((await POST(request({}))).status).toBe(403);
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("no convierte una selección vacía o un ID inválido en todos los pedidos", async () => {
    expect((await POST(request({ ids: [] }))).status).toBe(400);
    expect((await POST(request({ ids: ["invalid"] }))).status).toBe(400);
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("excluye un pedido entregado mientras se preparaba el PDF", async () => {
    mocks.load.mockResolvedValue([{ ...shopOrderFixture, status: "delivered" }]);
    expect((await POST(request({ ids: [shopOrderFixture.id] }))).status).toBe(409);
  });
  it("entrega un PDF privado como archivo descargable", async () => {
    const response = await POST(request({ ids: [shopOrderFixture.id] }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect((await response.text()).startsWith("%PDF-")).toBe(true);
  });
});
