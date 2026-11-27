import { apiFetch } from "@/lib/api/client";
import type { CatalogPaginationMeta } from "@/types/catalog.types";

export interface AdminCustomerSummary {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  authProvider: "local" | "google";
  role: "customer";
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  orderCount: number;
  totalSpending: number; // integer cents
}

export interface AdminCustomerAddress {
  _id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface AdminCustomerOrderStats {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  totalSpending: number;
  mostRecentOrderAt: string | null;
}

export interface AdminCustomerOrderItem {
  _id: string;
  orderNumber: string;
  fulfilmentStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  createdAt: string;
}

export interface AdminCustomerDetailResponse {
  customer: Omit<AdminCustomerSummary, "orderCount" | "totalSpending"> & {
    addresses: AdminCustomerAddress[];
  };
  orderStats: AdminCustomerOrderStats;
  orders: AdminCustomerOrderItem[];
}

export interface AdminCustomerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "all" | "active" | "inactive";
  sortBy?: "createdAt" | "firstName" | "email" | "lastLoginAt";
  sortOrder?: "asc" | "desc";
}

interface CustomersListResponse {
  message: string;
  data: AdminCustomerSummary[];
  meta: CatalogPaginationMeta;
}

interface CustomerDetailApiResponse {
  message: string;
  data: AdminCustomerDetailResponse;
}

interface UpdateCustomerStatusApiResponse {
  message: string;
  data: Omit<AdminCustomerSummary, "orderCount" | "totalSpending">;
}

export async function getAdminCustomers(
  params: AdminCustomerQueryParams = {},
): Promise<{ data: AdminCustomerSummary[]; meta: CatalogPaginationMeta }> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);

  const query = qs.toString();
  const res = await apiFetch<CustomersListResponse>(
    query ? `/admin/customers?${query}` : "/admin/customers",
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return { data: res.data ?? [], meta: res.meta };
}

export async function getAdminCustomerById(
  customerId: string,
): Promise<AdminCustomerDetailResponse> {
  const res = await apiFetch<CustomerDetailApiResponse>(
    `/admin/customers/${encodeURIComponent(customerId)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return res.data;
}

export async function updateAdminCustomerStatus(
  customerId: string,
  isActive: boolean,
): Promise<Omit<AdminCustomerSummary, "orderCount" | "totalSpending">> {
  const res = await apiFetch<UpdateCustomerStatusApiResponse>(
    `/admin/customers/${encodeURIComponent(customerId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    },
  );
  return res.data;
}
