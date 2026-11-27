"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import {
  archiveAdminProduct,
  getAdminProducts,
} from "@/lib/api/admin-products.api";
import {
  formatPriceCents,
  getCategories,
} from "@/lib/api/catalog.api";
import { ApiError } from "@/lib/api/client";
import type { CatalogCategory, CatalogProduct } from "@/types/catalog.types";

type StatusFilter = "" | "published" | "draft" | "out_of_stock" | "archived";
type SortValue =
  | "createdAt:desc"
  | "name:asc"
  | "price:asc"
  | "price:desc"
  | "stock:asc";

const LIMIT_OPTIONS = [12, 24, 50] as const;

function getProductStatusTone(
  status: CatalogProduct["status"],
): "neutral" | "success" | "warning" | "danger" {
  switch (status) {
    case "published":
      return "success";
    case "out_of_stock":
      return "danger";
    case "draft":
      return "warning";
    case "archived":
    default:
      return "neutral";
  }
}

export function AdminProductsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const initialLimit = LIMIT_OPTIONS.includes(
    Number(searchParams.get("limit")) as 12 | 24 | 50,
  )
    ? (Number(searchParams.get("limit")) as 12 | 24 | 50)
    : 12;

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") || "",
  );
  const [debouncedSearch, setDebouncedSearch] = useState(
    searchParams.get("search") || "",
  );
  const [categoryId, setCategoryId] = useState(
    searchParams.get("category") || "",
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get("status") || "") as StatusFilter,
  );
  const [inStockOnly, setInStockOnly] = useState(
    searchParams.get("inStockOnly") === "true",
  );
  const [sortValue, setSortValue] = useState<SortValue>(
    (searchParams.get("sort") || "createdAt:desc") as SortValue,
  );
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState<12 | 24 | 50>(initialLimit);

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [meta, setMeta] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const requestSeqRef = useRef(0);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim() !== debouncedSearch) {
        setDebouncedSearch(searchInput.trim());
        setPage(1);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [debouncedSearch, searchInput]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (limit !== 12) params.set("limit", String(limit));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (categoryId) params.set("category", categoryId);
    if (statusFilter) params.set("status", statusFilter);
    if (inStockOnly) params.set("inStockOnly", "true");
    if (sortValue !== "createdAt:desc") params.set("sort", sortValue);

    const qs = params.toString();
    router.replace(qs ? `/admin/products?${qs}` : "/admin/products", {
      scroll: false,
    });
  }, [
    categoryId,
    debouncedSearch,
    inStockOnly,
    limit,
    page,
    router,
    sortValue,
    statusFilter,
  ]);

  const [sortBy, sortOrder] = sortValue.split(":") as [
    "createdAt" | "name" | "price" | "stock",
    "asc" | "desc",
  ];

  const fetchProducts = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    try {
      const res = await getAdminProducts({
        page,
        limit,
        search: debouncedSearch || undefined,
        category: categoryId || undefined,
        status: statusFilter || undefined,
        inStockOnly: inStockOnly || undefined,
        sortBy,
        sortOrder,
      });

      if (seq !== requestSeqRef.current) return;
      if (
        (res.data ?? []).length === 0 &&
        page > 1 &&
        res.meta.totalPages > 0 &&
        page > res.meta.totalPages
      ) {
        setPage(res.meta.totalPages);
        return;
      }
      setProducts(res.data ?? []);
      setMeta(res.meta);
      setError(null);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login?redirect=%2Fadmin%2Fproducts");
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        router.replace("/admin/unauthorized");
        return;
      }
      setError(
        err instanceof ApiError ? err.message : "Unable to load products.",
      );
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [
    categoryId,
    debouncedSearch,
    inStockOnly,
    limit,
    page,
    router,
    sortBy,
    sortOrder,
    statusFilter,
  ]);

  useEffect(() => {
    const seq = ++requestSeqRef.current;
    getAdminProducts({
      page,
      limit,
      search: debouncedSearch || undefined,
      category: categoryId || undefined,
      status: statusFilter || undefined,
      inStockOnly: inStockOnly || undefined,
      sortBy,
      sortOrder,
    })
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        if (
          (res.data ?? []).length === 0 &&
          page > 1 &&
          res.meta.totalPages > 0 &&
          page > res.meta.totalPages
        ) {
          setPage(res.meta.totalPages);
          return;
        }
        setProducts(res.data ?? []);
        setMeta(res.meta);
        setError(null);
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login?redirect=%2Fadmin%2Fproducts");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/admin/unauthorized");
          return;
        }
        setError(
          err instanceof ApiError ? err.message : "Unable to load products.",
        );
      })
      .finally(() => {
        if (seq === requestSeqRef.current) setLoading(false);
      });
  }, [
    categoryId,
    debouncedSearch,
    inStockOnly,
    limit,
    page,
    router,
    sortBy,
    sortOrder,
    statusFilter,
  ]);

  const handleArchiveProduct = async (productId: string) => {
    if (archivingId) return;
    setArchivingId(productId);
    try {
      await archiveAdminProduct(productId);
      setConfirmArchiveId(null);
      setLoading(true);
      await fetchProducts();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to archive product.",
      );
    } finally {
      setArchivingId(null);
    }
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setCategoryId("");
    setStatusFilter("");
    setInStockOnly(false);
    setSortValue("createdAt:desc");
    setPage(1);
    setLoading(true);
  };

  const hasActiveFilters = Boolean(
    debouncedSearch || categoryId || statusFilter || inStockOnly,
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="COMMERCE CATALOGUE"
        title="Products"
        description="Manage forged hardware, specifications, stock levels, and Cloudinary media."
        actions={
          <>
            <AdminStatusBadge label={`${meta.total} Products`} />
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase font-medium transition-colors min-h-[40px]"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Product
            </Link>
          </>
        }
      />

      {/* Search, Filters & Sort */}
      <div className="border border-white/10 bg-[#0D0D0F] p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4 relative">
            <Search
              className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, SKU, or description..."
              aria-label="Search products"
              className="w-full h-11 bg-[#141417] border border-white/15 pl-10 pr-4 text-sm text-[#F5F5F3] placeholder:text-[#71717A] focus:outline-none focus:border-[#F5F5F3]"
            />
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by category"
              value={categoryId}
              onChange={(e) => {
                setLoading(true);
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="w-full h-11 bg-[#141417] border border-white/15 px-3 text-xs uppercase tracking-[0.1em] text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setLoading(true);
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
              className="w-full h-11 bg-[#141417] border border-white/15 px-3 text-xs uppercase tracking-[0.1em] text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
            >
              <option value="">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Sort products"
              value={sortValue}
              onChange={(e) => {
                setLoading(true);
                setSortValue(e.target.value as SortValue);
                setPage(1);
              }}
              className="w-full h-11 bg-[#141417] border border-white/15 px-3 text-xs uppercase tracking-[0.1em] text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
            >
              <option value="createdAt:desc">Newest First</option>
              <option value="name:asc">Name (A–Z)</option>
              <option value="price:asc">Price (Low–High)</option>
              <option value="price:desc">Price (High–Low)</option>
              <option value="stock:asc">Stock (Low–High)</option>
            </select>
          </div>

          <div className="lg:col-span-2 flex items-center gap-2">
            <select
              aria-label="Products per page"
              value={limit}
              onChange={(e) => {
                setLoading(true);
                setLimit(Number(e.target.value) as 12 | 24 | 50);
                setPage(1);
              }}
              className="w-full h-11 bg-[#141417] border border-white/15 px-2.5 text-xs text-[#F5F5F3] tabular-nums focus:outline-none focus:border-[#F5F5F3]"
            >
              {LIMIT_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}/pg
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="inline-flex items-center gap-2 text-xs text-[#A1A1AA] cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => {
                setLoading(true);
                setInStockOnly(e.target.checked);
                setPage(1);
              }}
              className="accent-[#C81E1E]"
            />
            In Stock Only
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 border border-white/10 bg-[#0D0D0F]"
            />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <p className="text-sm text-[#A1A1AA]">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              void fetchProducts();
            }}
            className="inline-flex items-center gap-2 bg-[#C81E1E] text-[#F5F5F3] px-4 py-2 text-[10px] tracking-[0.2em] uppercase cursor-pointer min-h-[40px]"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : products.length === 0 ? (
        <AdminEmptyState
          title="No Products Found"
          description={
            hasActiveFilters
              ? "No products match the selected search or filter criteria."
              : "Start building the catalogue by adding your first product."
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="border border-white/15 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3] cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <Link
                href="/admin/products/new"
                className="inline-flex items-center gap-2 bg-[#C81E1E] text-[#F5F5F3] px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase"
              >
                Add Product
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="hidden lg:block border border-white/10 bg-[#0D0D0F] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] tracking-[0.2em] uppercase text-[#71717A]">
                  <th className="py-3.5 px-4 font-normal">Product</th>
                  <th className="py-3.5 px-4 font-normal">SKU</th>
                  <th className="py-3.5 px-4 font-normal">Category</th>
                  <th className="py-3.5 px-4 font-normal">Stock</th>
                  <th className="py-3.5 px-4 font-normal">Status</th>
                  <th className="py-3.5 px-4 font-normal text-right">Price</th>
                  <th className="py-3.5 px-4 font-normal text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {products.map((prod) => {
                  const primaryImg =
                    prod.images.find((i) => i.isPrimary)?.url ||
                    prod.images[0]?.url;
                  const catName =
                    typeof prod.category === "object" && prod.category
                      ? prod.category.name
                      : "—";
                  const isLow =
                    prod.availableStock > 0 &&
                    prod.availableStock <= prod.lowStockThreshold;

                  return (
                    <tr
                      key={prod._id}
                      className="hover:bg-[#141417]/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-9 shrink-0 border border-white/15 bg-[#141417] overflow-hidden">
                            {primaryImg ? (
                              <Image
                                src={primaryImg}
                                alt={prod.name}
                                fill
                                unoptimized
                                sizes="48px"
                                className="object-contain p-0.5"
                              />
                            ) : (
                              <span className="text-[7px] text-[#71717A] flex items-center justify-center h-full">
                                APX
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/admin/products/${prod._id}`}
                            className="font-medium text-[#F5F5F3] hover:text-[#C81E1E] transition-colors truncate max-w-[260px]"
                          >
                            {prod.name}
                          </Link>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle text-xs text-[#A1A1AA] tabular-nums">
                        {prod.sku}
                      </td>
                      <td className="py-3.5 px-4 align-middle text-xs text-[#A1A1AA]">
                        {catName}
                      </td>
                      <td className="py-3.5 px-4 align-middle text-xs tabular-nums">
                        <span
                          className={
                            prod.availableStock <= 0
                              ? "text-[#C81E1E]"
                              : isLow
                                ? "text-amber-400"
                                : "text-[#F5F5F3]"
                          }
                        >
                          {prod.availableStock} avail
                        </span>
                        <span className="text-[#71717A]">
                          {" "}
                          / {prod.stock} total
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <AdminStatusBadge
                          label={prod.status.replaceAll("_", " ")}
                          tone={getProductStatusTone(prod.status)}
                        />
                      </td>
                      <td className="py-3.5 px-4 align-middle text-right font-medium text-[#F5F5F3] tabular-nums">
                        {formatPriceCents(prod.price, prod.currency)}
                      </td>
                      <td className="py-3.5 px-4 align-middle text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/admin/products/${prod._id}`}
                            className="border border-white/15 bg-[#141417] px-3 py-1.5 text-[10px] tracking-[0.16em] uppercase text-[#F5F5F3] hover:border-white/40"
                          >
                            View
                          </Link>
                          <Link
                            href={`/admin/products/${prod._id}/edit`}
                            className="border border-white/15 px-3 py-1.5 text-[10px] tracking-[0.16em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] hover:border-white/40"
                          >
                            Edit
                          </Link>
                          {prod.status !== "archived" &&
                            (confirmArchiveId === prod._id ? (
                              <button
                                type="button"
                                disabled={archivingId === prod._id}
                                onClick={() =>
                                  void handleArchiveProduct(prod._id)
                                }
                                className="bg-[#C81E1E] text-[#F5F5F3] px-2.5 py-1.5 text-[10px] tracking-[0.16em] uppercase cursor-pointer"
                              >
                                Confirm
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmArchiveId(prod._id)}
                                className="border border-white/15 px-2.5 py-1.5 text-[10px] tracking-[0.16em] uppercase text-[#A1A1AA] hover:text-[#C81E1E] hover:border-[#C81E1E]/60 cursor-pointer"
                              >
                                Archive
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {products.map((prod) => {
              const catName =
                typeof prod.category === "object" && prod.category
                  ? prod.category.name
                  : "—";
              return (
                <article
                  key={prod._id}
                  className="border border-white/10 bg-[#0D0D0F] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${prod._id}`}
                        className="font-medium text-sm text-[#F5F5F3] block truncate"
                      >
                        {prod.name}
                      </Link>
                      <p className="text-xs text-[#71717A] tabular-nums">
                        {prod.sku} · {catName}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-[#F5F5F3] tabular-nums shrink-0">
                      {formatPriceCents(prod.price, prod.currency)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminStatusBadge
                      label={prod.status.replaceAll("_", " ")}
                      tone={getProductStatusTone(prod.status)}
                    />
                    <span className="text-xs text-[#A1A1AA] tabular-nums">
                      {prod.availableStock} avail / {prod.stock} total
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <Link
                      href={`/admin/products/${prod._id}`}
                      className="border border-white/15 bg-[#141417] px-3.5 py-2 text-[10px] tracking-[0.16em] uppercase text-[#F5F5F3] min-h-[40px] inline-flex items-center"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/products/${prod._id}/edit`}
                      className="border border-white/15 px-3.5 py-2 text-[10px] tracking-[0.16em] uppercase text-[#A1A1AA] min-h-[40px] inline-flex items-center"
                    >
                      Edit
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <nav
              aria-label="Admin products pagination"
              className="flex flex-wrap items-center justify-between gap-4 border border-white/10 bg-[#0D0D0F] px-5 py-3.5"
            >
              <p className="text-xs text-[#A1A1AA] tabular-nums">
                Page {meta.page} of {meta.totalPages} · {meta.total} products
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={meta.page <= 1 || loading}
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  className="inline-flex items-center gap-1.5 border border-white/15 bg-[#141417] px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] disabled:opacity-40 cursor-pointer min-h-[44px]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={meta.page >= meta.totalPages || loading}
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => Math.min(meta.totalPages, p + 1));
                  }}
                  className="inline-flex items-center gap-1.5 border border-white/15 bg-[#141417] px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] disabled:opacity-40 cursor-pointer min-h-[44px]"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
