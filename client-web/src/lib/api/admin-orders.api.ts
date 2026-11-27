import { apiFetch } from "@/lib/api/client";
import type { OrdersListResponse } from "@/lib/api/orders.api";
import type {
  FormattedOrder,
  OrderFulfilmentStatus,
  OrderPaymentStatus,
} from "@/types/order.types";

export interface AdminOrderQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  fulfilmentStatus?: OrderFulfilmentStatus;
  paymentStatus?: OrderPaymentStatus;
}

export interface UpdateAdminOrderStatusPayload {
  fulfilmentStatus: OrderFulfilmentStatus;
  codPaymentReceived?: boolean;
  note?: string;
  shippingProvider?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

interface AdminOrderResponse {
  message: string;
  data: FormattedOrder;
}

export async function getAdminOrders(
  params: AdminOrderQueryParams = {},
): Promise<OrdersListResponse> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 10));
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.fulfilmentStatus) {
    qs.set("fulfilmentStatus", params.fulfilmentStatus);
  }
  if (params.paymentStatus) {
    qs.set("paymentStatus", params.paymentStatus);
  }

  return apiFetch<OrdersListResponse>(`/admin/orders?${qs.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
}

export async function getAdminOrderById(
  orderId: string,
): Promise<FormattedOrder> {
  const res = await apiFetch<AdminOrderResponse>(
    `/admin/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return res.data;
}

export async function updateAdminOrderStatus(
  orderId: string,
  payload: UpdateAdminOrderStatusPayload,
): Promise<FormattedOrder> {
  const res = await apiFetch<AdminOrderResponse>(
    `/admin/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}
