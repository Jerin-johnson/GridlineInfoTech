import { apiFetch } from "@/lib/api/client";
import type { CatalogPaginationMeta } from "@/types/catalog.types";

export interface AdminPaymentsSummary {
  collectedRevenue: number;
  successfulPayments: number;
  pendingPayments: number;
  failedExpiredPayments: number;
  cryptoRevenue: number;
  codCollected: number;
}

export interface AdminPaymentTransactionItem {
  id: string;
  source: "payment" | "cod_order";
  paymentReference: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  currency: string;
  orderTotalAmount: number;
  expectedAmount?: string;
  receivedAmount?: string;
  token?: string;
  tokenDecimals?: number;
  network?: string;
  chainId?: number;
  status: string;
  transactionHash?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  attemptNumber?: number;
  failureReason?: string;
  expiresAt?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface AdminPaymentAttemptHistoryItem {
  id: string;
  paymentReference: string;
  attemptNumber: number;
  status: string;
  transactionHash?: string;
  expectedAmount: string;
  receivedAmount?: string;
  failureReason?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface AdminPaymentDetail {
  id: string;
  source: "payment" | "cod_order";
  paymentReference: string;
  orderPaymentReference: string;
  attemptNumber: number;
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    currency: string;
    paymentStatus: string;
    fulfilmentStatus: string;
    paymentMethod: string;
  } | null;
  customer: {
    id: string;
    name: string;
    email: string;
  } | null;
  paymentMethod: string;
  expectedAmount?: string;
  receivedAmount?: string;
  currency: string;
  orderTotalAmount: number;
  status: string;
  transactionHash?: string;
  chainId?: number;
  network?: string;
  token?: string;
  tokenAddress?: string;
  tokenDecimals?: number;
  destinationAddress?: string;
  walletAddress?: string;
  blockNumber?: number;
  confirmations?: number;
  requiredConfirmations?: number;
  failureReason?: string;
  expiresAt?: string;
  verifiedAt?: string;
  createdAt?: string;
  attemptHistory: AdminPaymentAttemptHistoryItem[];
}

export type AdminPaymentStatusFilter =
  | "all"
  | "verified"
  | "paid"
  | "pending"
  | "confirming"
  | "failed"
  | "expired";

export interface AdminPaymentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AdminPaymentStatusFilter;
  paymentMethod?: "all" | "crypto_wallet" | "cod";
  dateFrom?: string;
  dateTo?: string;
}

export async function getAdminPaymentsSummary(): Promise<AdminPaymentsSummary> {
  const res = await apiFetch<{ message: string; data: AdminPaymentsSummary }>(
    "/admin/payments/summary",
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return res.data;
}

export async function getAdminPayments(
  params: AdminPaymentQueryParams = {},
): Promise<{
  data: AdminPaymentTransactionItem[];
  meta: CatalogPaginationMeta;
}> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.paymentMethod && params.paymentMethod !== "all") {
    qs.set("paymentMethod", params.paymentMethod);
  }
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params.dateTo) qs.set("dateTo", params.dateTo);

  const query = qs.toString();
  const res = await apiFetch<{
    message: string;
    data: AdminPaymentTransactionItem[];
    meta: CatalogPaginationMeta;
  }>(query ? `/admin/payments?${query}` : "/admin/payments", {
    method: "GET",
    cache: "no-store",
  });
  return { data: res.data ?? [], meta: res.meta };
}

export async function getAdminPaymentById(
  transactionId: string,
): Promise<AdminPaymentDetail> {
  const res = await apiFetch<{ message: string; data: AdminPaymentDetail }>(
    `/admin/payments/${encodeURIComponent(transactionId)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return res.data;
}
