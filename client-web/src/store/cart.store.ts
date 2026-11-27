"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  addToCart,
  clearCartApi,
  getCart,
  mergeCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/api/cart.api";
import { getProductById } from "@/lib/api/catalog.api";
import { ApiError } from "@/lib/api/client";
import type { CatalogProduct } from "@/types/catalog.types";
import type {
  CartItem,
  CartMode,
  FormattedCart,
  GuestCartPersistedItem,
} from "@/types/cart.types";

interface CartState {
  mode: CartMode;
  hasHydrated: boolean;
  authChecked: boolean;
  currentUserId: string | null;

  guestItems: GuestCartPersistedItem[];
  items: CartItem[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  estimatedShipping: number;
  estimatedTax: number;
  total: number;
  currency: string;

  isLoading: boolean;
  isMigrating: boolean;
  isClearing: boolean;
  pendingProductIds: Record<string, boolean>;
  error: string | null;
  rowErrors: Record<string, string>;
  migrationError: string | null;
  migrationWarnings: string[];

  setHasHydrated: (hydrated: boolean) => void;
  initForUser: (user: { id: string } | null) => Promise<void>;
  refreshCart: () => Promise<void>;
  revalidateGuestCart: () => Promise<void>;
  addItem: (product: CatalogProduct, quantity: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  migrateGuestCart: () => Promise<void>;
  logoutToGuest: () => void;
  clearRowError: (productId: string) => void;
  dismissMigrationWarnings: () => void;
}

let activeInitPromise: Promise<void> | null = null;
let lastInitKey: string | null = null;

function getPrimaryImageUrl(product: CatalogProduct): string | undefined {
  if (!product.images || product.images.length === 0) return undefined;
  return (
    product.images.find((img) => img.isPrimary)?.url || product.images[0]?.url
  );
}

function computeTotalsFromItems(items: CartItem[]) {
  let subtotal = 0;
  let totalQuantity = 0;
  for (const item of items) {
    if (item.isAvailable) {
      subtotal += item.itemTotal;
    }
    totalQuantity += item.quantity;
  }
  return {
    itemCount: items.length,
    totalQuantity,
    subtotal,
    estimatedShipping: 0,
    estimatedTax: 0,
    total: subtotal,
    currency: "USD",
  };
}

function buildUnvalidatedGuestItems(
  guestItems: GuestCartPersistedItem[],
): CartItem[] {
  return guestItems.map((g) => ({
    productId: g.productId,
    name: g.name,
    slug: g.slug,
    sku: g.sku,
    image: g.image,
    price: 0,
    quantity: g.quantity,
    itemTotal: 0,
    availableStock: 0,
    isAvailable: false,
  }));
}

function applyFormattedCart(cart: FormattedCart) {
  return {
    items: cart.items,
    itemCount: cart.itemCount,
    totalQuantity: cart.totalQuantity,
    subtotal: cart.subtotal,
    estimatedShipping: cart.estimatedShipping,
    estimatedTax: cart.estimatedTax,
    total: cart.total,
    currency: cart.currency || "USD",
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      mode: "guest",
      hasHydrated: false,
      authChecked: false,
      currentUserId: null,

      guestItems: [],
      items: [],
      itemCount: 0,
      totalQuantity: 0,
      subtotal: 0,
      estimatedShipping: 0,
      estimatedTax: 0,
      total: 0,
      currency: "USD",

      isLoading: false,
      isMigrating: false,
      isClearing: false,
      pendingProductIds: {},
      error: null,
      rowErrors: {},
      migrationError: null,
      migrationWarnings: [],

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      initForUser: async (user) => {
        const key = user ? `auth:${user.id}` : "guest";
        if (activeInitPromise && lastInitKey === key) {
          return activeInitPromise;
        }

        lastInitKey = key;
        const run = (async () => {
          if (!user) {
            set({
              mode: "guest",
              authChecked: true,
              currentUserId: null,
            });
            await get().revalidateGuestCart();
            return;
          }

          set({
            mode: "authenticated",
            authChecked: true,
            currentUserId: user.id,
          });

          if (get().guestItems.length > 0) {
            await get().migrateGuestCart();
          } else {
            await get().refreshCart();
          }
        })().finally(() => {
          activeInitPromise = null;
        });

        activeInitPromise = run;
        return run;
      },

      refreshCart: async () => {
        const { mode } = get();
        if (mode === "guest") {
          await get().revalidateGuestCart();
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const cart = await getCart();
          set({
            ...applyFormattedCart(cart),
            isLoading: false,
            error: null,
          });
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            // Session expired — fall back cleanly without discarding guestItems
            set({
              mode: "guest",
              currentUserId: null,
              isLoading: false,
            });
            await get().revalidateGuestCart();
            return;
          }
          set({
            isLoading: false,
            error:
              err instanceof Error
                ? err.message
                : "Unable to load your bag. Please try again.",
          });
        }
      },

      revalidateGuestCart: async () => {
        const { guestItems } = get();
        if (guestItems.length === 0) {
          set({
            items: [],
            itemCount: 0,
            totalQuantity: 0,
            subtotal: 0,
            estimatedShipping: 0,
            estimatedTax: 0,
            total: 0,
            isLoading: false,
            error: null,
          });
          return;
        }

        set({ isLoading: true, error: null });

        const results = await Promise.allSettled(
          guestItems.map((entry) => getProductById(entry.productId)),
        );

        let networkFailure = false;
        const nextItems: CartItem[] = [];
        const updatedPersisted: GuestCartPersistedItem[] = [];

        results.forEach((result, idx) => {
          const persisted = guestItems[idx];
          if (result.status === "fulfilled") {
            const product = result.value;
            const image = getPrimaryImageUrl(product) ?? persisted.image;
            const isAvailable =
              product.status === "published" &&
              product.availableStock >= persisted.quantity;
            const price = Number(product.price) || 0;

            updatedPersisted.push({
              productId: persisted.productId,
              quantity: persisted.quantity,
              name: product.name,
              slug: product.slug,
              sku: product.sku,
              image,
            });

            nextItems.push({
              productId: persisted.productId,
              name: product.name,
              slug: product.slug,
              sku: product.sku,
              image,
              price,
              quantity: persisted.quantity,
              itemTotal: price * persisted.quantity,
              availableStock: product.availableStock,
              isAvailable,
            });
          } else {
            updatedPersisted.push(persisted);
            const reason = result.reason;
            if (reason instanceof ApiError && reason.status === 404) {
              nextItems.push({
                productId: persisted.productId,
                name: `${persisted.name} (Unavailable)`,
                slug: "",
                sku: persisted.sku,
                image: persisted.image,
                price: 0,
                quantity: persisted.quantity,
                itemTotal: 0,
                availableStock: 0,
                isAvailable: false,
              });
            } else {
              networkFailure = true;
              nextItems.push({
                productId: persisted.productId,
                name: persisted.name,
                slug: persisted.slug,
                sku: persisted.sku,
                image: persisted.image,
                price: 0,
                quantity: persisted.quantity,
                itemTotal: 0,
                availableStock: 0,
                isAvailable: false,
              });
            }
          }
        });

        set({
          guestItems: updatedPersisted,
          items: nextItems,
          ...computeTotalsFromItems(nextItems),
          isLoading: false,
          error: networkFailure
            ? "Could not verify live pricing and stock for all items. Retry to refresh."
            : null,
        });
      },

      addItem: async (product, quantity) => {
        const requested = Math.max(1, Math.floor(quantity));
        const { mode, guestItems, items, pendingProductIds } = get();

        if (pendingProductIds[product._id]) return;

        if (mode === "guest") {
          if (product.status !== "published" || product.availableStock <= 0) {
            throw new ApiError("Product is currently out of stock", 400);
          }

          const existing = guestItems.find((i) => i.productId === product._id);
          const nextQty = (existing?.quantity ?? 0) + requested;

          if (nextQty > product.availableStock) {
            throw new ApiError(
              existing
                ? `Cannot add ${requested} more. You already have ${existing.quantity} in your bag and available stock is ${product.availableStock}.`
                : `Requested quantity (${requested}) exceeds available stock (${product.availableStock}).`,
              400,
            );
          }

          const image = getPrimaryImageUrl(product);
          const nextGuestItems = existing
            ? guestItems.map((i) =>
                i.productId === product._id
                  ? {
                      ...i,
                      quantity: nextQty,
                      name: product.name,
                      slug: product.slug,
                      sku: product.sku,
                      image,
                    }
                  : i,
              )
            : [
                ...guestItems,
                {
                  productId: product._id,
                  quantity: nextQty,
                  name: product.name,
                  slug: product.slug,
                  sku: product.sku,
                  image,
                },
              ];

          const existingDisplay = items.find(
            (i) => i.productId === product._id,
          );
          const nextItem: CartItem = {
            productId: product._id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            image,
            price: product.price,
            quantity: nextQty,
            itemTotal: product.price * nextQty,
            availableStock: product.availableStock,
            isAvailable: true,
          };

          const nextItems = existingDisplay
            ? items.map((i) => (i.productId === product._id ? nextItem : i))
            : [...items, nextItem];

          set({
            guestItems: nextGuestItems,
            items: nextItems,
            ...computeTotalsFromItems(nextItems),
            error: null,
          });
          return;
        }

        // Authenticated mode
        set((s) => ({
          pendingProductIds: { ...s.pendingProductIds, [product._id]: true },
        }));
        try {
          const cart = await addToCart({
            productId: product._id,
            quantity: requested,
          });
          set((s) => {
            const nextPending = { ...s.pendingProductIds };
            delete nextPending[product._id];
            return {
              ...applyFormattedCart(cart),
              pendingProductIds: nextPending,
              error: null,
            };
          });
        } catch (err) {
          set((s) => {
            const nextPending = { ...s.pendingProductIds };
            delete nextPending[product._id];
            return { pendingProductIds: nextPending };
          });
          throw err;
        }
      },

      updateQuantity: async (productId, quantity) => {
        const nextQty = Math.max(1, Math.floor(quantity));
        const { mode, guestItems, items, pendingProductIds } = get();

        if (pendingProductIds[productId]) return;

        const targetItem = items.find((i) => i.productId === productId);
        if (!targetItem) return;

        if (mode === "guest") {
          if (
            targetItem.availableStock > 0 &&
            nextQty > targetItem.availableStock
          ) {
            set((s) => ({
              rowErrors: {
                ...s.rowErrors,
                [productId]: `Maximum available stock is ${targetItem.availableStock}.`,
              },
            }));
            return;
          }

          const nextGuest = guestItems.map((i) =>
            i.productId === productId ? { ...i, quantity: nextQty } : i,
          );
          const nextItems = items.map((i) =>
            i.productId === productId
              ? {
                  ...i,
                  quantity: nextQty,
                  itemTotal: i.price * nextQty,
                  isAvailable:
                    i.availableStock >= nextQty && i.availableStock > 0,
                }
              : i,
          );

          set((s) => {
            const nextErrors = { ...s.rowErrors };
            delete nextErrors[productId];
            return {
              guestItems: nextGuest,
              items: nextItems,
              ...computeTotalsFromItems(nextItems),
              rowErrors: nextErrors,
            };
          });
          return;
        }

        // Authenticated mode: optimistic update + rollback on error
        const snapshot = items;
        const optimisticItems = items.map((i) =>
          i.productId === productId
            ? {
                ...i,
                quantity: nextQty,
                itemTotal: i.price * nextQty,
              }
            : i,
        );

        set((s) => {
          const nextErrors = { ...s.rowErrors };
          delete nextErrors[productId];
          return {
            items: optimisticItems,
            ...computeTotalsFromItems(optimisticItems),
            pendingProductIds: { ...s.pendingProductIds, [productId]: true },
            rowErrors: nextErrors,
          };
        });

        try {
          const cart = await updateCartItem(productId, { quantity: nextQty });
          set((s) => {
            const nextPending = { ...s.pendingProductIds };
            delete nextPending[productId];
            return {
              ...applyFormattedCart(cart),
              pendingProductIds: nextPending,
            };
          });
        } catch (err) {
          set((s) => {
            const nextPending = { ...s.pendingProductIds };
            delete nextPending[productId];
            return {
              items: snapshot,
              ...computeTotalsFromItems(snapshot),
              pendingProductIds: nextPending,
              rowErrors: {
                ...s.rowErrors,
                [productId]:
                  err instanceof Error
                    ? err.message
                    : "Could not update quantity.",
              },
            };
          });
        }
      },

      removeItem: async (productId) => {
        const { mode, guestItems, items, pendingProductIds } = get();
        if (pendingProductIds[productId]) return;

        if (mode === "guest") {
          const nextGuest = guestItems.filter((i) => i.productId !== productId);
          const nextItems = items.filter((i) => i.productId !== productId);
          set((s) => {
            const nextErrors = { ...s.rowErrors };
            delete nextErrors[productId];
            return {
              guestItems: nextGuest,
              items: nextItems,
              ...computeTotalsFromItems(nextItems),
              rowErrors: nextErrors,
            };
          });
          return;
        }

        const snapshot = items;
        const optimisticItems = items.filter((i) => i.productId !== productId);

        set((s) => ({
          items: optimisticItems,
          ...computeTotalsFromItems(optimisticItems),
          pendingProductIds: { ...s.pendingProductIds, [productId]: true },
        }));

        try {
          const cart = await removeCartItem(productId);
          set((s) => {
            const nextPending = { ...s.pendingProductIds };
            delete nextPending[productId];
            const nextErrors = { ...s.rowErrors };
            delete nextErrors[productId];
            return {
              ...applyFormattedCart(cart),
              pendingProductIds: nextPending,
              rowErrors: nextErrors,
            };
          });
        } catch (err) {
          set((s) => {
            const nextPending = { ...s.pendingProductIds };
            delete nextPending[productId];
            return {
              items: snapshot,
              ...computeTotalsFromItems(snapshot),
              pendingProductIds: nextPending,
              rowErrors: {
                ...s.rowErrors,
                [productId]:
                  err instanceof Error
                    ? err.message
                    : "Could not remove item.",
              },
            };
          });
        }
      },

      clearCart: async () => {
        const { mode, items } = get();
        if (mode === "guest") {
          set({
            guestItems: [],
            items: [],
            itemCount: 0,
            totalQuantity: 0,
            subtotal: 0,
            estimatedShipping: 0,
            estimatedTax: 0,
            total: 0,
            rowErrors: {},
            error: null,
          });
          return;
        }

        const snapshot = items;
        set({ isClearing: true, error: null });
        try {
          const cart = await clearCartApi();
          set({
            ...applyFormattedCart(cart),
            isClearing: false,
            rowErrors: {},
          });
        } catch (err) {
          set({
            items: snapshot,
            ...computeTotalsFromItems(snapshot),
            isClearing: false,
            error:
              err instanceof Error
                ? err.message
                : "Could not clear your bag. Please try again.",
          });
        }
      },

      migrateGuestCart: async () => {
        const { guestItems } = get();
        if (guestItems.length === 0) {
          await get().refreshCart();
          return;
        }

        set({ isMigrating: true, migrationError: null, error: null });
        try {
          const result = await mergeCart(
            guestItems.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            })),
          );

          // Only clear persisted guest items AFTER backend merge succeeds
          set({
            guestItems: [],
            ...applyFormattedCart(result.cart),
            isMigrating: false,
            migrationError: null,
            migrationWarnings: result.warnings ?? [],
          });
        } catch (err) {
          // Preserve guestItems intact on migration failure
          set({
            isMigrating: false,
            migrationError:
              err instanceof Error
                ? err.message
                : "Failed to merge your guest bag. Your items are preserved—retry below.",
          });
        }
      },

      logoutToGuest: () => {
        lastInitKey = "guest";
        const guestDisplay = buildUnvalidatedGuestItems(get().guestItems);
        set({
          mode: "guest",
          authChecked: true,
          currentUserId: null,
          items: guestDisplay,
          ...computeTotalsFromItems(guestDisplay),
          error: null,
          rowErrors: {},
          migrationError: null,
          migrationWarnings: [],
        });
      },

      clearRowError: (productId) =>
        set((s) => {
          const next = { ...s.rowErrors };
          delete next[productId];
          return { rowErrors: next };
        }),

      dismissMigrationWarnings: () => set({ migrationWarnings: [] }),
    }),
    {
      name: "apex-atelier-guest-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ guestItems: state.guestItems }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.setHasHydrated(true);
        if (state.mode === "guest" && state.guestItems.length > 0) {
          const initial = buildUnvalidatedGuestItems(state.guestItems);
          useCartStore.setState({
            items: initial,
            ...computeTotalsFromItems(initial),
          });
        }
      },
    },
  ),
);
