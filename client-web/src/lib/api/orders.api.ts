import { apiFetch } from "@/lib/api/client";
import type {
  CheckoutPayload,
  FormattedOrder,
  OrderQueryFilters,
} from "@/types/order.types";

interface OrderResponse {
  message: string;
  data: FormattedOrder;
}

export interface OrdersListResponse {
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
  filters: OrderQueryFilters = {},
): Promise<OrdersListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 10));
  if (filters.fulfilmentStatus) {
    params.set("fulfilmentStatus", filters.fulfilmentStatus);
  }
  if (filters.paymentStatus) {
    params.set("paymentStatus", filters.paymentStatus);
  }

  return apiFetch<OrdersListResponse>(`/orders?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
}

export async function cancelUserOrder(
  orderId: string,
  reason?: string,
): Promise<FormattedOrder> {
  const res = await apiFetch<OrderResponse>(
    `/orders/${encodeURIComponent(orderId)}/cancel`,
    {
      method: "POST",
      body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
    },
  );
  return res.data;
}
