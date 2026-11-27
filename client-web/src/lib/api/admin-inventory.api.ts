import { apiFetch } from "@/lib/api/client";
import type { CatalogImage, CatalogPaginationMeta } from "@/types/catalog.types";

export type InventoryStockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type InventoryMovementType =
  | "initial_stock"
  | "admin_adjustment"
  | "stock_reservation"
  | "reservation_release"
  | "order_fulfillment"
  | "order_cancellation";

export interface AdminInventoryItem {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  images: CatalogImage[];
  brand?: { _id: string; name: string; slug: string } | string;
  category?: { _id: string; name: string; slug: string } | string;
  stock: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  status: "draft" | "published" | "out_of_stock" | "archived";
  inventoryStatus: InventoryStockStatus;
  updatedAt?: string;
}

export interface AdminInventorySummary {
  totalProducts: number;
  totalStockUnits: number;
  totalAvailableStock: number;
  totalReservedStock: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface AdminInventoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  stockStatus?: "all" | InventoryStockStatus;
  sortBy?:
    | "name"
    | "sku"
    | "stock"
    | "reservedStock"
    | "availableStock"
    | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface AdminInventoryResponse {
  message: string;
  data: AdminInventoryItem[];
  meta: CatalogPaginationMeta;
  summary: AdminInventorySummary;
}

export interface AdminInventoryMovement {
  _id: string;
  product?: { _id: string; name: string; sku: string } | string;
  type: InventoryMovementType;
  quantity: number;
  delta: number;
  previousStock: number;
  resultingStock: number;
  previousReservedStock: number;
  resultingReservedStock: number;
  reason: string;
  actor?: { _id: string; firstName: string; lastName: string; email: string };
  order?: { _id: string; orderNumber: string };
  createdAt: string;
}

export interface AdminInventoryMovementsResponse {
  message: string;
  data: AdminInventoryMovement[];
  meta: CatalogPaginationMeta;
}

export interface AdjustInventoryPayload {
  type: "increase" | "decrease";
  quantity: number;
  reason: string;
}

export async function getAdminInventory(
  params: AdminInventoryQueryParams = {},
): Promise<AdminInventoryResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.stockStatus && params.stockStatus !== "all") {
    qs.set("stockStatus", params.stockStatus);
  }
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);

  const query = qs.toString();
  return apiFetch<AdminInventoryResponse>(
    query ? `/admin/inventory?${query}` : "/admin/inventory",
    {
      method: "GET",
      cache: "no-store",
    },
  );
}

export async function getAdminInventoryMovements(params: {
  page?: number;
  limit?: number;
  productId?: string;
  type?: InventoryMovementType;
} = {}): Promise<AdminInventoryMovementsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.productId) qs.set("productId", params.productId);
  if (params.type) qs.set("type", params.type);

  const query = qs.toString();
  return apiFetch<AdminInventoryMovementsResponse>(
    query ? `/admin/inventory/movements?${query}` : "/admin/inventory/movements",
    {
      method: "GET",
      cache: "no-store",
    },
  );
}

export async function adjustAdminInventory(
  productId: string,
  payload: AdjustInventoryPayload,
): Promise<{
  product: AdminInventoryItem;
  movement: AdminInventoryMovement;
}> {
  const res = await apiFetch<{
    message: string;
    data: { product: AdminInventoryItem; movement: AdminInventoryMovement };
  }>(`/admin/inventory/${encodeURIComponent(productId)}/adjust`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}
