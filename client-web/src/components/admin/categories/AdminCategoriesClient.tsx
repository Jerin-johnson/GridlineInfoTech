"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  deactivateAdminCategory,
  getAdminCategories,
} from "@/lib/api/admin-categories.api";
import { ApiError } from "@/lib/api/client";
import type { CatalogCategory } from "@/types/catalog.types";

export function AdminCategoriesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") || "",
  );
  const [debouncedSearch, setDebouncedSearch] = useState(
    searchParams.get("search") || "",
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >((searchParams.get("status") || "all") as "all" | "active" | "inactive");
  const [page, setPage] = useState(initialPage);
  const limit = 10;

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [allCategories, setAllCategories] = useState<CatalogCategory[]>([]);
  const [meta, setMeta] = useState({
    page: initialPage,
    limit,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(
    null,
  );
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const requestSeqRef = useRef(0);

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of allCategories) {
      map.set(cat._id, cat.name);
    }
    for (const cat of categories) {
      if (!map.has(cat._id)) map.set(cat._id, cat.name);
    }
    return map;
  }, [allCategories, categories]);

  useEffect(() => {
    let active = true;
    getAdminCategories({ status: "all" })
      .then((res) => {
        if (active) setAllCategories(res.data);
      })
      .catch(() => {
        // Parent lookup fallback handled gracefully
      });
    return () => {
      active = false;
    };
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
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "all") params.set("status", statusFilter);
    const qs = params.toString();
    router.replace(qs ? `/admin/categories?${qs}` : "/admin/categories", {
      scroll: false,
    });
  }, [debouncedSearch, page, router, statusFilter]);

  const fetchCategories = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    try {
      const res = await getAdminCategories({
        status: statusFilter,
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      if (seq !== requestSeqRef.current) return;
      const nextMeta = res.meta ?? {
        page,
        limit,
        total: res.data.length,
        totalPages: 1,
      };
      if (
        res.data.length === 0 &&
        page > 1 &&
        nextMeta.totalPages > 0 &&
        page > nextMeta.totalPages
      ) {
        setPage(nextMeta.totalPages);
        return;
      }
      setCategories(res.data);
      setMeta(nextMeta);
      setError(null);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login?redirect=%2Fadmin%2Fcategories");
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        router.replace("/admin/unauthorized");
        return;
      }
      setError(
        err instanceof ApiError ? err.message : "Unable to load categories.",
      );
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [debouncedSearch, page, router, statusFilter]);

  useEffect(() => {
    const seq = ++requestSeqRef.current;
    getAdminCategories({
      status: statusFilter,
      search: debouncedSearch || undefined,
      page,
      limit,
    })
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        const nextMeta = res.meta ?? {
          page,
          limit,
          total: res.data.length,
          totalPages: 1,
        };
        if (
          res.data.length === 0 &&
          page > 1 &&
          nextMeta.totalPages > 0 &&
          page > nextMeta.totalPages
        ) {
          setPage(nextMeta.totalPages);
          return;
        }
        setCategories(res.data);
        setMeta(nextMeta);
        setError(null);
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login?redirect=%2Fadmin%2Fcategories");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/admin/unauthorized");
          return;
        }
        setError(
          err instanceof ApiError ? err.message : "Unable to load categories.",
        );
      })
      .finally(() => {
        if (seq === requestSeqRef.current) setLoading(false);
      });
  }, [debouncedSearch, page, router, statusFilter]);

  const handleDeactivate = async (categoryId: string) => {
    if (deactivatingId) return;
    setDeactivatingId(categoryId);
    try {
      await deactivateAdminCategory(categoryId);
      setConfirmDeactivateId(null);
      setLoading(true);
      await fetchCategories();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to deactivate category.",
      );
    } finally {
      setDeactivatingId(null);
    }
  };

  const hasActiveFilters = Boolean(debouncedSearch || statusFilter !== "all");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="COMMERCE TAXONOMY"
        title="Categories"
        description="Organize performance part categories and hierarchy."
        actions={
          <>
            <AdminStatusBadge label={`${meta.total} Categories`} />
            <Link
              href="/admin/categories/new"
              className="inline-flex items-center gap-2 bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase font-medium transition-colors min-h-[40px]"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Category
            </Link>
          </>
        }
      />

      {/* Search & Status Filter */}
      <div className="border border-white/10 bg-[#0D0D0F] p-4 sm:p-5 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search
            className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search categories by name or slug..."
            aria-label="Search categories"
            className="w-full h-11 bg-[#141417] border border-white/15 pl-10 pr-4 text-sm text-[#F5F5F3] placeholder:text-[#71717A] focus:outline-none focus:border-[#F5F5F3]"
          />
        </div>

        <select
          aria-label="Filter categories by status"
          value={statusFilter}
          onChange={(e) => {
            setLoading(true);
            setStatusFilter(e.target.value as "all" | "active" | "inactive");
            setPage(1);
          }}
          className="sm:w-44 h-11 bg-[#141417] border border-white/15 px-3 text-xs uppercase tracking-[0.12em] text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setDebouncedSearch("");
              setStatusFilter("all");
              setPage(1);
              setLoading(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 border border-white/15 px-4 h-11 text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 border border-white/10 bg-[#0D0D0F]" />
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
              void fetchCategories();
            }}
            className="inline-flex items-center gap-2 bg-[#C81E1E] text-[#F5F5F3] px-4 py-2 text-[10px] tracking-[0.2em] uppercase cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      ) : categories.length === 0 ? (
        <AdminEmptyState
          title="No Categories Found"
          description={
            hasActiveFilters
              ? "No categories match your current search or status filter."
              : "Create your first product category before adding hardware."
          }
          action={
            <Link
              href="/admin/categories/new"
              className="inline-flex items-center gap-2 bg-[#C81E1E] text-[#F5F5F3] px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase"
            >
              Add Category
            </Link>
          }
        />
      ) : (
        <>
          <div className="border border-white/10 bg-[#0D0D0F] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] tracking-[0.2em] uppercase text-[#71717A]">
                  <th className="py-3.5 px-4 font-normal">Category</th>
                  <th className="py-3.5 px-4 font-normal">Parent</th>
                  <th className="py-3.5 px-4 font-normal">Slug</th>
                  <th className="py-3.5 px-4 font-normal">Status</th>
                  <th className="py-3.5 px-4 font-normal text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {categories.map((category) => (
                  <tr
                    key={category._id}
                    className="hover:bg-[#141417]/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="relative w-11 h-8 shrink-0 border border-white/15 bg-[#141417] overflow-hidden">
                          {category.image ? (
                            <Image
                              src={category.image}
                              alt={category.name}
                              fill
                              unoptimized
                              sizes="44px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-[7px] text-[#71717A] flex items-center justify-center h-full">
                              CAT
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[#F5F5F3] truncate">
                            {category.name}
                          </p>
                          {category.description && (
                            <p className="text-xs text-[#71717A] truncate max-w-md">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-middle text-xs text-[#A1A1AA]">
                      {category.parent
                        ? categoryNameMap.get(category.parent) ?? "Parent"
                        : "Root"}
                    </td>
                    <td className="py-3.5 px-4 align-middle text-xs text-[#A1A1AA]">
                      {category.slug}
                    </td>
                    <td className="py-3.5 px-4 align-middle">
                      <AdminStatusBadge
                        label={category.status}
                        tone={
                          category.status === "active" ? "success" : "neutral"
                        }
                      />
                    </td>
                    <td className="py-3.5 px-4 align-middle text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/categories/${category._id}/edit`}
                          className="border border-white/15 bg-[#141417] px-3 py-1.5 text-[10px] tracking-[0.16em] uppercase text-[#F5F5F3] hover:border-white/40"
                        >
                          Edit
                        </Link>
                        {category.status === "active" &&
                          (confirmDeactivateId === category._id ? (
                            <button
                              type="button"
                              disabled={deactivatingId === category._id}
                              onClick={() => void handleDeactivate(category._id)}
                              className="bg-[#C81E1E] text-[#F5F5F3] px-2.5 py-1.5 text-[10px] tracking-[0.16em] uppercase cursor-pointer"
                            >
                              Confirm ({category.name})
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDeactivateId(category._id)
                              }
                              className="border border-white/15 px-2.5 py-1.5 text-[10px] tracking-[0.16em] uppercase text-[#A1A1AA] hover:text-[#C81E1E] hover:border-[#C81E1E]/60 cursor-pointer"
                            >
                              Deactivate
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <nav
              aria-label="Categories pagination"
              className="flex items-center justify-between gap-4 border border-white/10 bg-[#0D0D0F] px-5 py-3.5"
            >
              <p className="text-xs text-[#A1A1AA] tabular-nums">
                Page {meta.page} of {meta.totalPages} · {meta.total} categories
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
