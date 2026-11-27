import { apiFetch } from "@/lib/api/client";
import type {
  CatalogCompatibility,
  CatalogImage,
  CatalogProduct,
  CatalogSpecification,
  PaginatedProductsResponse,
  ProductQueryParams,
} from "@/types/catalog.types";

export interface AdminProductPayload {
  name: string;
  slug?: string;
  sku: string;
  description?: string;
  category: string;
  brand: string;
  price: number; // integer cents
  compareAtPrice?: number;
  currency?: string;
  images?: CatalogImage[];
  specifications?: CatalogSpecification[];
  compatibility?: CatalogCompatibility[];
  stock?: number;
  lowStockThreshold?: number;
  status?: "draft" | "published" | "out_of_stock" | "archived";
  isFeatured?: boolean;
}

export type UpdateAdminProductPayload = Partial<AdminProductPayload>;

interface SingleProductResponse {
  message: string;
  data: CatalogProduct;
}

export interface AdminProductQueryParams extends ProductQueryParams {
  status?: "draft" | "published" | "out_of_stock" | "archived";
}

export async function getAdminProducts(
  params: AdminProductQueryParams = {},
): Promise<PaginatedProductsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.category) qs.set("category", params.category);
  if (params.brand) qs.set("brand", params.brand);
  if (params.status) qs.set("status", params.status);
  if (params.inStockOnly !== undefined) {
    qs.set("inStockOnly", String(params.inStockOnly));
  }
  if (params.isFeatured !== undefined) {
    qs.set("isFeatured", String(params.isFeatured));
  }
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);

  const query = qs.toString();
  return apiFetch<PaginatedProductsResponse>(
    query ? `/products?${query}` : "/products",
    {
      method: "GET",
      cache: "no-store",
    },
  );
}

export async function getAdminProductById(
  productId: string,
): Promise<CatalogProduct> {
  const res = await apiFetch<SingleProductResponse>(
    `/products/${encodeURIComponent(productId)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return res.data;
}

export async function createAdminProduct(
  payload: AdminProductPayload,
): Promise<CatalogProduct> {
  const res = await apiFetch<SingleProductResponse>("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateAdminProduct(
  productId: string,
  payload: UpdateAdminProductPayload,
): Promise<CatalogProduct> {
  const res = await apiFetch<SingleProductResponse>(
    `/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function uploadAdminProductImage(
  productId: string,
  file: File,
  alt?: string,
  isPrimary?: boolean,
): Promise<CatalogProduct> {
  const formData = new FormData();
  formData.append("image", file);
  if (alt?.trim()) formData.append("alt", alt.trim());
  if (isPrimary !== undefined) formData.append("isPrimary", String(isPrimary));

  const res = await apiFetch<SingleProductResponse>(
    `/products/${encodeURIComponent(productId)}/images`,
    {
      method: "POST",
      body: formData,
    },
  );
  return res.data;
}

export async function removeAdminProductImage(
  productId: string,
  publicId: string,
): Promise<CatalogProduct> {
  const res = await apiFetch<SingleProductResponse>(
    `/products/${encodeURIComponent(productId)}/images`,
    {
      method: "DELETE",
      body: JSON.stringify({ publicId }),
    },
  );
  return res.data;
}

export async function archiveAdminProduct(
  productId: string,
): Promise<CatalogProduct> {
  const res = await apiFetch<SingleProductResponse>(
    `/products/${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
    },
  );
  return res.data;
}
