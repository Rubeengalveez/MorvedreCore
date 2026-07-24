import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

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
});
