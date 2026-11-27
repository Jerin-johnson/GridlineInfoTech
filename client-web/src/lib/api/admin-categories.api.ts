import { apiFetch } from "@/lib/api/client";
import type {
  CatalogCategory,
  CatalogPaginationMeta,
} from "@/types/catalog.types";

export interface AdminCategoryQueryParams {
  status?: "active" | "inactive" | "all";
  parent?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminCategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  parent?: string | null;
  status?: "active" | "inactive";
}

export type UpdateAdminCategoryPayload = Partial<AdminCategoryPayload>;

interface CategoriesListResponse {
  message: string;
  data: CatalogCategory[];
  meta?: CatalogPaginationMeta;
}

interface SingleCategoryResponse {
  message: string;
  data: CatalogCategory;
}

export async function getAdminCategories(
  params: AdminCategoryQueryParams = {},
): Promise<{ data: CatalogCategory[]; meta?: CatalogPaginationMeta }> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.parent !== undefined) qs.set("parent", params.parent);
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));

  const query = qs.toString();
  const res = await apiFetch<CategoriesListResponse>(
    query ? `/categories?${query}` : "/categories",
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return { data: res.data ?? [], meta: res.meta };
}

export async function getAdminCategoryById(
  categoryId: string,
): Promise<CatalogCategory> {
  const res = await apiFetch<SingleCategoryResponse>(
    `/categories/${encodeURIComponent(categoryId)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return res.data;
}

export async function createAdminCategory(
  payload: AdminCategoryPayload,
): Promise<CatalogCategory> {
  const res = await apiFetch<SingleCategoryResponse>("/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateAdminCategory(
  categoryId: string,
  payload: UpdateAdminCategoryPayload,
): Promise<CatalogCategory> {
  const res = await apiFetch<SingleCategoryResponse>(
    `/categories/${encodeURIComponent(categoryId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function deactivateAdminCategory(
  categoryId: string,
): Promise<CatalogCategory> {
  const res = await apiFetch<SingleCategoryResponse>(
    `/categories/${encodeURIComponent(categoryId)}`,
    {
      method: "DELETE",
    },
  );
  return res.data;
}
