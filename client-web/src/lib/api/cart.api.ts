import { apiFetch } from "@/lib/api/client";
import type { AddToCartPayload, FormattedCart } from "@/types/cart.types";

interface CartApiResponse {
  message: string;
  data: FormattedCart;
}

export const CART_UPDATED_EVENT = "apex:cart-updated";

export function emitCartUpdated(totalQuantity: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ totalQuantity: number }>(CART_UPDATED_EVENT, {
      detail: { totalQuantity },
    }),
  );
}

export async function getCart(): Promise<FormattedCart> {
  const res = await apiFetch<CartApiResponse>("/cart", {
    method: "GET",
    cache: "no-store",
  });
  return res.data;
}

export async function addToCart(
  payload: AddToCartPayload,
): Promise<FormattedCart> {
  const res = await apiFetch<CartApiResponse>("/cart/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  emitCartUpdated(res.data.totalQuantity);
  return res.data;
}
