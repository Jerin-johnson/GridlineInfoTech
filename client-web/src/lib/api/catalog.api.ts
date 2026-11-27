import { apiFetch } from "@/lib/api/client";
import type {
  BrandsResponse,
  CatalogBrand,
  CatalogCategory,
  CatalogProduct,
  CatalogSortOption,
  CategoriesResponse,
  PaginatedProductsResponse,
  ProductQueryParams,
} from "@/types/catalog.types";

export async function getProducts(
  params: ProductQueryParams = {},
): Promise<PaginatedProductsResponse> {
  const searchParams = new URLSearchParams();

  if (params.page && params.page > 1) {
    searchParams.set("page", String(params.page));
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.brand) {
    searchParams.set("brand", params.brand);
  }
  if (params.minPrice !== undefined && params.minPrice >= 0) {
    searchParams.set("minPrice", String(Math.round(params.minPrice)));
  }
  if (params.maxPrice !== undefined && params.maxPrice >= 0) {
    searchParams.set("maxPrice", String(Math.round(params.maxPrice)));
  }
  if (params.inStockOnly) {
    searchParams.set("inStockOnly", "true");
  }
  if (params.isFeatured) {
    searchParams.set("isFeatured", "true");
  }
  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }
  if (params.sortOrder) {
    searchParams.set("sortOrder", params.sortOrder);
  }

  const query = searchParams.toString();
  const path = query ? `/products?${query}` : "/products";

  return apiFetch<PaginatedProductsResponse>(path, {
    method: "GET",
    cache: "no-store",
  });
}

export async function getCategories(): Promise<CatalogCategory[]> {
  const res = await apiFetch<CategoriesResponse>("/categories?status=active", {
    method: "GET",
    cache: "no-store",
  });
  return res.data ?? [];
}

export async function getBrands(): Promise<CatalogBrand[]> {
  const res = await apiFetch<BrandsResponse>("/brands?status=active", {
    method: "GET",
    cache: "no-store",
  });
  return res.data ?? [];
}

export function formatPriceCents(
  cents: number,
  currency = "USD",
): string {
  const dollars = cents / 100;
  const hasRemainder = cents % 100 !== 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: hasRemainder ? 2 : 0,
    maximumFractionDigits: hasRemainder ? 2 : 0,
  }).format(dollars);
}

export function mapSortOptionToQuery(
  sort: CatalogSortOption,
): Pick<ProductQueryParams, "sortBy" | "sortOrder" | "isFeatured"> {
  switch (sort) {
    case "price_asc":
      return { sortBy: "price", sortOrder: "asc" };
    case "price_desc":
      return { sortBy: "price", sortOrder: "desc" };
    case "featured":
      return { sortBy: "createdAt", sortOrder: "desc", isFeatured: true };
    case "newest":
    default:
      return { sortBy: "createdAt", sortOrder: "desc" };
  }
}

export function resolveEntityIdBySlugOrId<
  T extends { _id: string; slug: string },
>(items: T[], value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  const found = items.find(
    (item) =>
      item._id === value || item.slug.toLowerCase() === normalized,
  );
  return found?._id;
}

interface SingleProductResponse {
  message: string;
  data: CatalogProduct;
}

interface RelatedProductsResponse {
  message: string;
  data: CatalogProduct[];
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct> {
  const encoded = encodeURIComponent(slug.trim().toLowerCase());
  const res = await apiFetch<SingleProductResponse>(
    `/products/slug/${encoded}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return res.data;
}

export async function getProductById(id: string): Promise<CatalogProduct> {
  const encoded = encodeURIComponent(id.trim());
  const res = await apiFetch<SingleProductResponse>(`/products/${encoded}`, {
    method: "GET",
    cache: "no-store",
  });
  return res.data;
}

export async function getRelatedProducts(
  idOrSlug: string,
  limit = 4,
): Promise<CatalogProduct[]> {
  const encoded = encodeURIComponent(idOrSlug);
  const res = await apiFetch<RelatedProductsResponse>(
    `/products/${encoded}/related?limit=${limit}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return res.data ?? [];
}
