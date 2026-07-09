"use client";

import { useState, useCallback, useEffect } from "react";

export interface CartItem {
  productId: string;
  size: string | null;
  quantity: number;
}

const STORAGE_KEY = "morvedre-shop-cart-v1";

function readFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is CartItem =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as { productId: unknown }).productId === "string" &&
          typeof (x as { quantity: unknown }).quantity === "number",
      )
      .map((x) => ({
        productId: (x as { productId: string }).productId,
        size:
          typeof (x as { size: unknown }).size === "string"
            ? (x as { size: string }).size || null
            : null,
        quantity: Math.max(1, Math.floor((x as { quantity: number }).quantity)),
      }));
  } catch {
    return [];
  }
}

function writeToStorage(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function useShopCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setItems(readFromStorage());
      setHydrated(true);
    });
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    writeToStorage(next);
  }, []);

  const addItem = useCallback(
    (item: CartItem) => {
      const idx = items.findIndex(
        (x) => x.productId === item.productId && (x.size ?? null) === (item.size ?? null),
      );
      let next: CartItem[];
      if (idx >= 0) {
        next = items.map((x, i) =>
          i === idx ? { ...x, quantity: x.quantity + item.quantity } : x,
        );
      } else {
        next = [...items, item];
      }
      persist(next);
    },
    [items, persist],
  );

  const removeItem = useCallback(
    (productId: string, size: string | null) => {
      persist(
        items.filter((x) => !(x.productId === productId && (x.size ?? null) === (size ?? null))),
      );
    },
    [items, persist],
  );

  const setQuantity = useCallback(
    (productId: string, size: string | null, quantity: number) => {
      const safe = Math.max(1, Math.floor(quantity));
      persist(
        items.map((x) =>
          x.productId === productId && (x.size ?? null) === (size ?? null)
            ? { ...x, quantity: safe }
            : x,
        ),
      );
    },
    [items, persist],
  );

  const clear = useCallback(() => {
    persist([]);
  }, [persist]);

  return {
    items,
    hydrated,
    addItem,
    removeItem,
    setQuantity,
    clear,
  };
}
