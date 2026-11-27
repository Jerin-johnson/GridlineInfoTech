import { apiFetch } from "@/lib/api/client";
import type {
  AddToCartPayload,
  FormattedCart,
  MergeCartItemPayload,
  MergeCartResult,
  UpdateCartItemPayload,
} from "@/types/cart.types";

interface CartApiResponse {
  message: string;
  data: FormattedCart;
}

interface MergeCartApiResponse {
  message: string;
  data: MergeCartResult;
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
  return res.data;
}

export async function updateCartItem(
  productId: string,
  payload: UpdateCartItemPayload,
): Promise<FormattedCart> {
  const res = await apiFetch<CartApiResponse>(
    `/cart/items/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function removeCartItem(
  productId: string,
): Promise<FormattedCart> {
  const res = await apiFetch<CartApiResponse>(
    `/cart/items/${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
    },
  );
  return res.data;
}

export async function clearCartApi(): Promise<FormattedCart> {
  const res = await apiFetch<CartApiResponse>("/cart", {
    method: "DELETE",
  });
  return res.data;
}

export async function mergeCart(
  items: MergeCartItemPayload[],
): Promise<MergeCartResult> {
  const res = await apiFetch<MergeCartApiResponse>("/cart/merge", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
  return res.data;
}
