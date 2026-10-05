import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { CartClient } from "@/app/(app)/shop/_components/cart-client";
import { ShopCatalog } from "@/app/(app)/shop/_components/shop-catalog";
import { ShopOrders } from "@/app/(app)/shop/_components/shop-orders";
import { AddToCartButton } from "@/app/(app)/shop/[id]/_components/add-to-cart-button";
import { shopProductFixture, shopOrderFixture } from "../fixtures/shop-management";
const state = vi.hoisted(() => ({ create: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: state.refresh }) }));
vi.mock("@/server/actions/admin/shop", () => ({ createShopOrder: state.create }));
vi.mock("@/components/shop/shop-person-name", () => ({
  ShopPersonName: ({ name }: { name: string }) => <span>{name}</span>,
}));
vi.mock("@/components/shop/shop-decision-sheet", () => ({
  ShopDecisionSheet: ({
    open,
    title,
    body,
    actions,
    error,
    pending,
  }: {
    open: boolean;
    title: string;
    body: React.ReactNode;
    actions: Array<{ label: string; onClick: () => void }>;
    error?: string;
    pending?: boolean;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {body}
        {error ? <p role="alert">{error}</p> : null}
        {actions.map((action) => (
          <button key={action.label} disabled={pending} onClick={action.onClick}>
            {action.label}
          </button>
        ))}
      </div>
    ) : null,
}));
const product = { ...shopProductFixture, sizes: [], personalization_enabled: false };
const profile = "qa-profile";
function seed(quantity = 1) {
  localStorage.setItem(
    `morvedre-shop-cart:v3:${profile}`,
    JSON.stringify([{ productId: product.id, size: null, personalization: null, quantity }]),
  );
}
async function checkout(requiresGuardian = false, phone: string | null = "612345678") {
  render(
    <CartClient
      profileId={profile}
      products={[product]}
      initialPhone={phone}
      requiresGuardian={requiresGuardian}
    />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Revisar y confirmar pedido" }));
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  state.create.mockResolvedValue({ id: shopOrderFixture.id, order_reference: "02102026A" });
});
afterEach(cleanup);
describe("Tienda pública", () => {
  it("sin conexión no envía ni borra el carrito y permite confirmar al recuperarla", async () => {
    seed();
    await checkout();
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    try {
      fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
      expect(screen.getByText(/Ahora no tienes conexión/)).toBeInTheDocument();
      expect(state.create).not.toHaveBeenCalled();
      expect(JSON.parse(localStorage.getItem(`morvedre-shop-cart:v3:${profile}`)!)).toHaveLength(1);
      online.mockReturnValue(true);
      fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
      await screen.findByText("Pedido confirmado");
      expect(state.create).toHaveBeenCalledOnce();
    } finally {
      online.mockRestore();
    }
  });
  it("no envía si no puede conservar la clave que protege el reintento", async () => {
    seed();
    await checkout();
    const storage = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("No space");
    });
    try {
      fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
      await screen.findByText(/No pudimos preparar el envío/);
      expect(state.create).not.toHaveBeenCalled();
      expect(JSON.parse(localStorage.getItem(`morvedre-shop-cart:v3:${profile}`)!)).toHaveLength(1);
    } finally {
      storage.mockRestore();
    }
  });
  it("buscar sin tildes y por palabras sueltas encuentra el producto", () => {
    render(
      <ShopCatalog products={[{ ...product, title: "Bañador femenino", category: "Bañadores" }]} />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "BANADOR fem" } });
    expect(screen.getByRole("link", { name: /Bañador femenino/ })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "inexistente" } });
    expect(screen.getByText("No encontramos ese producto")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver todos los productos" }));
    expect(screen.getByRole("link", { name: /Bañador femenino/ })).toBeInTheDocument();
  });
  it("el filtro es independiente de la búsqueda y se puede quitar", () => {
    render(
      <ShopCatalog
        products={[product, { ...product, id: "other", category: "Accesorios", title: "Toalla" }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Filtros" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Sudaderas" } });
    expect(screen.queryByRole("link", { name: /Toalla/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quitar filtro" }));
    expect(screen.getByRole("link", { name: /Toalla/ })).toBeInTheDocument();
  });
  it("los pedidos por aprobar aparecen en activos y los cancelados en historial", () => {
    render(
      <ShopOrders
        orders={[
          { ...shopOrderFixture, status: "pending_parent" },
          { ...shopOrderFixture, id: "other", status: "cancelled", order_reference: "CANCELADO" },
        ]}
      />,
    );
    expect(screen.getByText("Por aprobar")).toBeInTheDocument();
    expect(screen.queryByText("CANCELADO")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Historial/ }));
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
  });
  it("no confirma hasta que se pulsa el botón del modal", async () => {
    seed();
    await checkout();
    expect(state.create).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("¿Confirmar este pedido?");
    fireEvent.click(screen.getByRole("button", { name: "Volver al carrito" }));
    expect(state.create).not.toHaveBeenCalled();
  });
  it("confirma desde una IP por HTTP aunque randomUUID no esté disponible", async () => {
    const secureRandom = crypto.getRandomValues.bind(crypto);
    vi.stubGlobal("crypto", { getRandomValues: secureRandom });
    try {
      seed();
      await checkout();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
      await waitFor(() => expect(state.create).toHaveBeenCalledOnce());
      expect(state.create.mock.calls[0][0].checkout_key).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      await screen.findByText("Pedido confirmado");
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("conserva cantidad, importe y teléfono y muestra el comprobante sin redirección automática", async () => {
    seed(2);
    await checkout();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
    await screen.findByText("Pedido confirmado");
    expect(state.create).toHaveBeenCalledWith(
      expect.objectContaining({
        expected_total_cents: 7000,
        contact_phone: "+34612345678",
        items: [expect.objectContaining({ quantity: 2 })],
        checkout_key: expect.any(String),
      }),
    );
    expect(JSON.parse(localStorage.getItem(`morvedre-shop-cart:v3:${profile}`)!)).toEqual([]);
    expect(screen.getByRole("link", { name: "Ver mi pedido" })).toHaveAttribute(
      "href",
      `/shop/orders/${shopOrderFixture.id}`,
    );
  });
  it("un fallo deja el carrito y el reintento utiliza la misma clave", async () => {
    seed();
    state.create.mockRejectedValueOnce(new Error("Fallo de red"));
    await checkout();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
    await screen.findByText("Fallo de red");
    expect(screen.queryByRole("button", { name: "Actualizar carrito" })).not.toBeInTheDocument();
    expect(state.refresh).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Confirmar pedido" })).toBeEnabled(),
    );
    expect(JSON.parse(localStorage.getItem(`morvedre-shop-cart:v3:${profile}`)!)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
    await screen.findByText("Pedido confirmado");
    expect(state.create.mock.calls[0][0].checkout_key).toBe(
      state.create.mock.calls[1][0].checkout_key,
    );
  });
  it("dos pulsaciones rápidas no crean dos envíos", async () => {
    seed();
    state.create.mockImplementation(() => new Promise(() => {}));
    await checkout();
    const confirm = screen.getByRole("button", { name: "Confirmar pedido" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
  });
  it("si cambia el precio actualiza los datos sin añadir un botón al modal", async () => {
    seed();
    state.create.mockRejectedValueOnce(
      new Error(
        "El precio ha cambiado. Actualiza el carrito y revisa el nuevo total antes de confirmar.",
      ),
    );
    await checkout();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
    await screen.findByText("El precio ha cambiado. Revisa el nuevo total antes de confirmar.");
    expect(state.refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Actualizar carrito" })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(`morvedre-shop-cart:v3:${profile}`)!)).toHaveLength(1);
  });
  it("no envía un pedido adulto sin teléfono válido", async () => {
    seed();
    await checkout(false, null);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
    expect(await screen.findByText(/Escribe un teléfono válido/)).toBeInTheDocument();
    expect(state.create).not.toHaveBeenCalled();
  });
  it("los menores envían a la familia sin proporcionar el teléfono del menor", async () => {
    seed();
    await checkout(true, null);
    fireEvent.click(screen.getByRole("button", { name: "Enviar a mi familia" }));
    await screen.findByText("Enviado a tu familia");
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({ contact_phone: null }));
  });
  it("bloquea un producto ocultado tras añadirlo y permite quitarlo", async () => {
    seed();
    render(
      <CartClient
        profileId={profile}
        products={[]}
        initialPhone="612345678"
        requiresGuardian={false}
      />,
    );
    const action = await screen.findByRole("button", { name: "Revisar y confirmar pedido" });
    expect(action).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Quitar producto retirado" }));
    await screen.findByText("Tu carrito está vacío");
    expect(state.create).not.toHaveBeenCalled();
  });
  it("sumar y restar unidades cambia el total antes de confirmar", async () => {
    seed();
    render(
      <CartClient
        profileId={profile}
        products={[product]}
        initialPhone="612345678"
        requiresGuardian={false}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: /Una unidad más/ }));
    expect(screen.getAllByText("70,00 €")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Una unidad menos/ }));
    expect(screen.getAllByText("35,00 €")).toHaveLength(2);
  });
  it("exige talla y nombre y evita un doble añadido accidental", async () => {
    render(
      <AddToCartButton
        profileId={profile}
        productId={product.id}
        available
        sizes={["M"]}
        personalizationEnabled
        personalizationLabel="Nombre"
        personalizationMaxLength={30}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Añadir al carrito" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Añadir al carrito" }));
    expect(screen.getByText(/Elige una talla/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "M" }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Juan" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir al carrito" }));
    expect(screen.getByRole("button", { name: "Añadido al carrito" })).toBeDisabled();
    expect(JSON.parse(localStorage.getItem(`morvedre-shop-cart:v3:${profile}`)!)[0]).toMatchObject({
      size: "M",
      personalization: "Juan",
      quantity: 1,
    });
  });
});
