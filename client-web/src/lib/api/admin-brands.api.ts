import { apiFetch } from "@/lib/api/client";
import type { CatalogBrand, CatalogPaginationMeta } from "@/types/catalog.types";

export interface AdminBrandQueryParams {
  status?: "active" | "inactive" | "all";
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminBrandPayload {
  name: string;
  slug?: string;
  description?: string;
  logo?: string;
  status?: "active" | "inactive";
}

export type UpdateAdminBrandPayload = Partial<AdminBrandPayload>;

interface BrandsListResponse {
  message: string;
  data: CatalogBrand[];
  meta?: CatalogPaginationMeta;
}

interface SingleBrandResponse {
  message: string;
  data: CatalogBrand;
}

interface UploadImageResponse {
  message: string;
  data: {
    url: string;
    publicId: string;
  };
}

export async function getAdminBrands(
  params: AdminBrandQueryParams = {},
): Promise<{ data: CatalogBrand[]; meta?: CatalogPaginationMeta }> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));

  const query = qs.toString();
  const res = await apiFetch<BrandsListResponse>(
    query ? `/brands?${query}` : "/brands",
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return { data: res.data ?? [], meta: res.meta };
}

export async function getAdminBrandById(
  brandId: string,
): Promise<CatalogBrand> {
  const res = await apiFetch<SingleBrandResponse>(
    `/brands/${encodeURIComponent(brandId)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return res.data;
}

export async function createAdminBrand(
  payload: AdminBrandPayload,
): Promise<CatalogBrand> {
  const res = await apiFetch<SingleBrandResponse>("/brands", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateAdminBrand(
  brandId: string,
  payload: UpdateAdminBrandPayload,
): Promise<CatalogBrand> {
  const res = await apiFetch<SingleBrandResponse>(
    `/brands/${encodeURIComponent(brandId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function deactivateAdminBrand(
  brandId: string,
): Promise<CatalogBrand> {
  const res = await apiFetch<SingleBrandResponse>(
    `/brands/${encodeURIComponent(brandId)}`,
    {
      method: "DELETE",
    },
  );
  return res.data;
}

export async function uploadAdminAssetImage(
  file: File,
  folder: "gridline/brands" | "gridline/categories",
): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("folder", folder);

  const res = await apiFetch<UploadImageResponse>("/uploads/image", {
    method: "POST",
    body: formData,
  });
  return res.data;
}
