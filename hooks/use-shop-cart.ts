"use client";

import { useState, useCallback, useEffect } from "react";

export interface CartItem {
  productId: string;
  size: string | null;
  personalization: string | null;
  quantity: number;
}

const STORAGE_KEY = "morvedre-shop-cart:v2";
const LEGACY_STORAGE_KEY = "morvedre-shop-cart-v1";

function readFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
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
        personalization:
          typeof (x as { personalization?: unknown }).personalization === "string"
            ? (x as { personalization: string }).personalization.trim() || null
            : null,
        quantity: 1,
      }));
  } catch {
    return [];
  }
}

function writeToStorage(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {}
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
        (x) =>
          x.productId === item.productId &&
          (x.size ?? null) === (item.size ?? null) &&
          (x.personalization ?? null) === (item.personalization ?? null),
      );
      let next: CartItem[];
      if (idx >= 0) {
        next = items.map((x, i) => (i === idx ? { ...x, quantity: 1 } : x));
      } else {
        next = [...items, { ...item, quantity: 1 }];
      }
      persist(next);
    },
    [items, persist],
  );

  const removeItem = useCallback(
    (productId: string, size: string | null, personalization: string | null) => {
      persist(
        items.filter(
          (x) =>
            !(
              x.productId === productId &&
              (x.size ?? null) === (size ?? null) &&
              (x.personalization ?? null) === (personalization ?? null)
            ),
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
    clear,
  };
}
