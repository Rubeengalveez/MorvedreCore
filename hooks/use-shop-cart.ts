"use client";

import { useCallback, useEffect, useState } from "react";

export interface CartItem {
  productId: string;
  size: string | null;
  personalization: string | null;
  quantity: number;
}

const STORAGE_PREFIX = "morvedre-shop-cart:v3:";
const OBSOLETE_STORAGE_KEYS = ["morvedre-shop-cart:v2", "morvedre-shop-cart-v1"];
const CART_EVENT = "morvedre-shop-cart-changed";

function storageKey(profileId: string): string {
  return `${STORAGE_PREFIX}${profileId}`;
}

function normalizeStoredItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is CartItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { productId?: unknown }).productId === "string" &&
        typeof (item as { quantity?: unknown }).quantity === "number",
    )
    .map((item) => ({
      productId: item.productId,
      size: typeof item.size === "string" ? item.size || null : null,
      personalization:
        typeof item.personalization === "string" ? item.personalization.trim() || null : null,
      quantity: 1,
    }));
}

function readFromStorage(profileId: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(profileId));
    return raw ? normalizeStoredItems(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function discardUnscopedCarts(): void {
  if (typeof window === "undefined") return;
  for (const key of OBSOLETE_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
}

function writeToStorage(profileId: string, items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(profileId), JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: { profileId } }));
  } catch {}
}

export function useShopCart(profileId: string) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    discardUnscopedCarts();
    queueMicrotask(() => {
      if (!active) return;
      setItems(readFromStorage(profileId));
      setHydrated(true);
    });

    const syncCart = (event: Event) => {
      if (
        event instanceof CustomEvent &&
        typeof event.detail === "object" &&
        event.detail !== null &&
        "profileId" in event.detail &&
        event.detail.profileId !== profileId
      ) {
        return;
      }
      setItems(readFromStorage(profileId));
    };
    const syncStoredCart = (event: StorageEvent) => {
      if (event.key === storageKey(profileId)) {
        setItems(readFromStorage(profileId));
      }
    };

    window.addEventListener(CART_EVENT, syncCart);
    window.addEventListener("storage", syncStoredCart);
    return () => {
      active = false;
      window.removeEventListener(CART_EVENT, syncCart);
      window.removeEventListener("storage", syncStoredCart);
    };
  }, [profileId]);

  const persist = useCallback(
    (next: CartItem[]) => {
      setItems(next);
      writeToStorage(profileId, next);
    },
    [profileId],
  );

  const addItem = useCallback(
    (item: CartItem) => {
      const current = readFromStorage(profileId);
      const index = current.findIndex(
        (existing) =>
          existing.productId === item.productId &&
          (existing.size ?? null) === (item.size ?? null) &&
          (existing.personalization ?? null) === (item.personalization ?? null),
      );
      const next =
        index >= 0
          ? current.map((existing, itemIndex) =>
              itemIndex === index ? { ...existing, quantity: 1 } : existing,
            )
          : [...current, { ...item, quantity: 1 }];
      persist(next);
    },
    [persist, profileId],
  );

  const removeItem = useCallback(
    (productId: string, size: string | null, personalization: string | null) => {
      const current = readFromStorage(profileId);
      persist(
        current.filter(
          (item) =>
            !(
              item.productId === productId &&
              (item.size ?? null) === (size ?? null) &&
              (item.personalization ?? null) === (personalization ?? null)
            ),
        ),
      );
    },
    [persist, profileId],
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
