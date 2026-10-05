"use client";

import { useCallback, useEffect, useState } from "react";
import { generateUuid } from "@/lib/utils/uuid";

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
      quantity: Number.isSafeInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1,
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
  try {
    for (const key of OBSOLETE_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {}
}

function writeToStorage(profileId: string, items: CartItem[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(storageKey(profileId), JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: { profileId } }));
    return true;
  } catch {
    return false;
  }
}

export function useShopCart(profileId: string) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const saved = writeToStorage(profileId, next);
      setError(
        saved
          ? null
          : "No pudimos guardar el carrito en este móvil. Revisa el espacio disponible y vuelve a intentarlo.",
      );
      if (saved) setItems(next);
      return saved;
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
              itemIndex === index
                ? { ...existing, quantity: existing.quantity + item.quantity }
                : existing,
            )
          : [...current, item];
      return persist(next);
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
    const cleared = persist([]);
    try {
      if (cleared) window.localStorage.removeItem(`${storageKey(profileId)}:checkout`);
    } catch {}
  }, [persist, profileId]);

  const setQuantity = useCallback(
    (item: CartItem, quantity: number) => {
      if (!Number.isSafeInteger(quantity) || quantity < 1) return;
      persist(
        readFromStorage(profileId).map((existing) =>
          existing.productId === item.productId &&
          existing.size === item.size &&
          existing.personalization === item.personalization
            ? { ...existing, quantity }
            : existing,
        ),
      );
    },
    [persist, profileId],
  );
  const checkoutKey = useCallback(
    (fingerprint: string) => {
      const key = `${storageKey(profileId)}:checkout`;
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const previous = JSON.parse(raw);
          if (previous.fingerprint === fingerprint && typeof previous.id === "string")
            return previous.id as string;
        }
        const id = generateUuid();
        window.localStorage.setItem(key, JSON.stringify({ fingerprint, id }));
        return id;
      } catch {
        throw new Error(
          "No pudimos preparar el envío. Revisa el almacenamiento del móvil y vuelve a intentarlo.",
        );
      }
    },
    [profileId],
  );

  return {
    items,
    hydrated,
    error,
    addItem,
    removeItem,
    clear,
    setQuantity,
    checkoutKey,
  };
}
