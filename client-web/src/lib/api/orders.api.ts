import { apiFetch } from "@/lib/api/client";
import type { CheckoutPayload, FormattedOrder } from "@/types/order.types";

interface OrderResponse {
  message: string;
  data: FormattedOrder;
}

interface OrdersListResponse {
  message: string;
  data: FormattedOrder[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function createCheckoutOrder(
  payload: CheckoutPayload,
): Promise<FormattedOrder> {
  const res = await apiFetch<OrderResponse>("/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function getOrderById(orderId: string): Promise<FormattedOrder> {
  const res = await apiFetch<OrderResponse>(
    `/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return res.data;
}

export async function getUserOrders(
  page = 1,
  limit = 10,
): Promise<OrdersListResponse> {
  return apiFetch<OrdersListResponse>(`/orders?page=${page}&limit=${limit}`, {
    method: "GET",
    cache: "no-store",
  });
}
