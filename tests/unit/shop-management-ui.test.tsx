import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ShopManagement } from "@/app/(app)/admin/shop/_components/shop-management";
import { ShopOrderCard } from "@/app/(app)/admin/shop/_components/shop-order-card";
import { ShopEditorForm } from "@/app/(app)/admin/shop/_components/shop-editor-form";
import { shopOrderFixture, shopProductFixture } from "../fixtures/shop-management";

const mocks = vi.hoisted(() => ({
  update: vi.fn().mockResolvedValue(undefined),
  availability: vi.fn().mockResolvedValue(undefined),
  create: vi.fn().mockResolvedValue({ id: "created" }),
  exit: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/lib/uploads/images", () => ({
  validateImageFile: vi.fn().mockResolvedValue({ extension: "jpg", contentType: "image/jpeg" }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: vi.fn(), back: vi.fn() }),
}));
vi.mock("@/server/actions/admin/shop", () => ({
  updateShopOrderStatus: mocks.update,
  setShopProductAvailability: mocks.availability,
  createShopProduct: mocks.create,
  updateShopProduct: vi.fn(),
  deleteShopProduct: vi.fn(),
}));
vi.mock("@/components/matches/use-acta-back-guard", () => ({ useActaBackGuard: () => mocks.exit }));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => `blob:${Math.random()}`),
      revokeObjectURL: vi.fn(),
    }),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
describe("Tienda para Sol", () => {
  it("separa pedidos y productos, pendientes y entregados", () => {
    render(
      <ShopManagement
        initialTab="orders"
        orders={[
          shopOrderFixture,
          {
            ...shopOrderFixture,
            id: "other",
            requested_by_name: "Persona entregada",
            status: "delivered",
          },
        ]}
        products={[shopProductFixture]}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Ver historial de Juan Pepe Marco López" }),
    ).toBeVisible();
    expect(screen.queryByText("Persona entregada")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Entregados/ }));
    expect(screen.getByTitle("Persona entregada")).toBeVisible();
    expect(screen.getByRole("button", { name: "Descargar PDF pedidos" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Productos" }));
    expect(screen.getByRole("link", { name: "Añadir producto" })).toBeVisible();
  });
  it("pide confirmar antes de marcar entregado", async () => {
    render(<ShopManagement initialTab="orders" orders={[shopOrderFixture]} products={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Marcar entregado" }));
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sí, ya está entregado" }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({
        order_id: shopOrderFixture.id,
        status: "delivered",
      }),
    );
  });
  it("seleccionar un pedido para PDF no lo marca entregado", () => {
    render(<ShopManagement initialTab="orders" orders={[shopOrderFixture]} products={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Descargar PDF pedidos" }));
    fireEvent.click(screen.getByRole("button", { name: "Elegir pedidos para el PDF" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Incluir pedido/ }));
    expect(screen.getByRole("button", { name: "Descargar PDF (1)" })).toBeEnabled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("conserva los datos al avanzar y volver, y guarda el precio con coma", async () => {
    render(<ShopEditorForm mode="create" />);
    fireEvent.change(screen.getByLabelText("Nombre del producto"), {
      target: { value: "Sudadera azul" },
    });
    fireEvent.change(screen.getByLabelText("Precio (€)"), { target: { value: "25,50" } });
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Sudadera con escudo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(screen.getByLabelText("¿Este producto tiene tallas?"), {
      target: { value: "sizes" },
    });
    fireEvent.click(screen.getByRole("button", { name: "M" }));
    fireEvent.click(screen.getByRole("button", { name: "Paso anterior" }));
    expect(screen.getByLabelText("Nombre del producto")).toHaveValue("Sudadera azul");
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar producto" }));
    expect(mocks.create).not.toHaveBeenCalled();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Guardar producto" }),
    );
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ price_eur: 25.5, sizes: ["M"] }),
      ),
    );
    await waitFor(() => expect(mocks.exit).toHaveBeenCalledWith("/admin/shop?view=products"));
  });
  it("no pierde cambios al tocar Volver accidentalmente", () => {
    render(<ShopEditorForm mode="create" />);
    fireEvent.change(screen.getByLabelText("Nombre del producto"), {
      target: { value: "Sudadera" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Volver a productos" }));
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(mocks.exit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(screen.getByLabelText("Nombre del producto")).toHaveValue("Sudadera");
  });
  it("abre Productos por defecto y confirma ocultar sin eliminar", async () => {
    render(<ShopManagement orders={[]} products={[shopProductFixture]} />);
    expect(screen.getByRole("button", { name: "Productos" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }));
    expect(mocks.availability).not.toHaveBeenCalled();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, ocultar" }),
    );
    await waitFor(() =>
      expect(mocks.availability).toHaveBeenCalledWith({
        product_id: shopProductFixture.id,
        available: false,
      }),
    );
  });
  it("muestra importes originales por producto en un pedido múltiple", () => {
    render(
      <ShopOrderCard
        order={{
          ...shopOrderFixture,
          total_cents: 4500,
          items: [
            ...shopOrderFixture.items,
            {
              ...shopOrderFixture.items[0],
              id: "other",
              product_title: "Gorro",
              size: null,
              personalization: null,
              unit_price_cents: 1000,
              subtotal_cents: 1000,
            },
          ],
        }}
        readonly
      />,
    );
    expect(screen.getByText("35,00 €")).toBeVisible();
    expect(screen.getByText("10,00 €")).toBeVisible();
    expect(screen.getByText("45,00 €")).toBeVisible();
  });
  it("acumula fotos, permite cambiar portada y borrar sin perder las demás", async () => {
    render(<ShopEditorForm mode="create" />);
    fireEvent.change(screen.getByLabelText("Nombre del producto"), {
      target: { value: "Camiseta" },
    });
    fireEvent.change(screen.getByLabelText("Precio (€)"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Azul" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    const input = screen.getByLabelText("Seleccionar fotos del producto");
    fireEvent.change(input, {
      target: { files: [new File(["a"], "a.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Añadir fotos · 1/8" })).toBeEnabled(),
    );
    fireEvent.change(input, {
      target: { files: [new File(["b"], "b.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Añadir fotos · 2/8" })).toBeEnabled(),
    );
    const original = screen.getByAltText("Foto 1, portada").getAttribute("src");
    fireEvent.click(screen.getByRole("button", { name: "Mover foto 2 antes" }));
    expect(screen.getByAltText("Foto 1, portada").getAttribute("src")).not.toBe(original);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar foto 2" }));
    expect(screen.getByRole("button", { name: "Añadir fotos · 1/8" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("¿Este producto tiene tallas?"), {
      target: { value: "one" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Única")).toBeVisible();
  });
});
