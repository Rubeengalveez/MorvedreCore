import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useShopCart } from "@/hooks/use-shop-cart";

describe("useShopCart", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("mantiene un carrito independiente para cada perfil", async () => {
    const { result, rerender } = renderHook(({ profileId }) => useShopCart(profileId), {
      initialProps: { profileId: "perfil-a" },
    });

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => {
      result.current.addItem({
        productId: "producto-1",
        size: "M",
        personalization: null,
        quantity: 1,
      });
    });

    expect(result.current.items).toHaveLength(1);

    rerender({ profileId: "perfil-b" });
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.addItem({
        productId: "producto-2",
        size: null,
        personalization: "RUBÉN",
        quantity: 1,
      });
    });

    rerender({ profileId: "perfil-a" });
    await waitFor(() => expect(result.current.items[0]?.productId).toBe("producto-1"));
    expect(result.current.items).toHaveLength(1);
  });

  it("descarta el antiguo carrito global que podía mezclarse entre cuentas", async () => {
    window.localStorage.setItem(
      "morvedre-shop-cart:v2",
      JSON.stringify([{ productId: "global", size: null, personalization: null, quantity: 1 }]),
    );

    const { result } = renderHook(() => useShopCart("perfil-seguro"));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    expect(result.current.items).toEqual([]);
    expect(window.localStorage.getItem("morvedre-shop-cart:v2")).toBeNull();
  });

  it("conserva unidades al recargar y actualiza una variante sin cambiar las otras", async () => {
    const item = { productId: "product", size: "M", personalization: null, quantity: 2 };
    window.localStorage.setItem(
      "morvedre-shop-cart:v3:perfil",
      JSON.stringify([item, { ...item, size: "L", quantity: 1 }]),
    );
    const { result } = renderHook(() => useShopCart("perfil"));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.items[0].quantity).toBe(2);
    act(() => result.current.setQuantity(item, 3));
    expect(result.current.items.map((line) => line.quantity)).toEqual([3, 1]);
  });
  it("mantiene la clave de envío tras recargar y la cambia cuando cambia el pedido", async () => {
    const { result, unmount } = renderHook(() => useShopCart("perfil"));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    const key = result.current.checkoutKey("total-20");
    unmount();
    const next = renderHook(() => useShopCart("perfil"));
    await waitFor(() => expect(next.result.current.hydrated).toBe(true));
    expect(next.result.current.checkoutKey("total-20")).toBe(key);
    expect(next.result.current.checkoutKey("total-30")).not.toBe(key);
    act(() => next.result.current.clear());
    expect(next.result.current.checkoutKey("total-20")).not.toBe(key);
  });
  it("no afirma que ha añadido un producto cuando el almacenamiento falla", async () => {
    const { result } = renderHook(() => useShopCart("perfil"));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("No space");
    };
    try {
      act(() =>
        expect(
          result.current.addItem({
            productId: "product",
            size: null,
            personalization: null,
            quantity: 1,
          }),
        ).toBe(false),
      );
      expect(result.current.items).toEqual([]);
      expect(result.current.error).toContain("No pudimos guardar");
    } finally {
      Storage.prototype.setItem = original;
    }
  });
  it("sin randomUUID mantiene la misma clave segura después de recargar", async () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });
    try {
      const first = renderHook(() => useShopCart("perfil-http"));
      await waitFor(() => expect(first.result.current.hydrated).toBe(true));
      const key = first.result.current.checkoutKey("pedido-20");
      first.unmount();
      const next = renderHook(() => useShopCart("perfil-http"));
      await waitFor(() => expect(next.result.current.hydrated).toBe(true));
      expect(next.result.current.checkoutKey("pedido-20")).toBe(key);
      expect(next.result.current.checkoutKey("pedido-30")).not.toBe(key);
      next.unmount();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
