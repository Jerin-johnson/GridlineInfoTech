"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type {
  CatalogBrand,
  CatalogCategory,
  CatalogPaginationMeta,
  CatalogProduct,
  CatalogSortOption,
} from "@/types/catalog.types";
import { CatalogueHeader } from "./CatalogueHeader";
import { CatalogueToolbar } from "./CatalogueToolbar";
import { CategoryNav } from "./CategoryNav";
import { FilterControls, type FilterState } from "./FilterControls";
import { Pagination } from "./Pagination";
import { ProductCard } from "./ProductCard";

interface CatalogueClientProps {
  products: CatalogProduct[];
  meta: CatalogPaginationMeta;
  categories: CatalogCategory[];
  brands: CatalogBrand[];
  activeCategory: string;
  activeCategoryName?: string;
  searchQuery: string;
  sortOption: CatalogSortOption;
  filters: FilterState;
  hasError?: boolean;
}

export function CatalogueClient({
  products,
  meta,
  categories,
  brands,
  activeCategory,
  activeCategoryName,
  searchQuery,
  sortOption,
  filters,
  hasError = false,
}: CatalogueClientProps) {
  const router = useRouter();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeFilterCount =
    (filters.brand ? 1 : 0) +
    (filters.minPriceDollars ? 1 : 0) +
    (filters.maxPriceDollars ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.isFeatured ? 1 : 0);

  // Lock body scroll & close mobile drawer on Escape
  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileFiltersOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileFiltersOpen]);

  const navigateWithParams = useCallback(
    (overrides: {
      category?: string;
      brand?: string;
      search?: string;
      minPriceDollars?: string;
      maxPriceDollars?: string;
      inStockOnly?: boolean;
      isFeatured?: boolean;
      sort?: CatalogSortOption;
      page?: number;
    }) => {
      const nextCategory =
        overrides.category !== undefined ? overrides.category : activeCategory;
      const nextBrand =
        overrides.brand !== undefined ? overrides.brand : filters.brand;
      const nextSearch =
        overrides.search !== undefined ? overrides.search : searchQuery;
      const nextMin =
        overrides.minPriceDollars !== undefined
          ? overrides.minPriceDollars
          : filters.minPriceDollars;
      const nextMax =
        overrides.maxPriceDollars !== undefined
          ? overrides.maxPriceDollars
          : filters.maxPriceDollars;
      const nextInStock =
        overrides.inStockOnly !== undefined
          ? overrides.inStockOnly
          : filters.inStockOnly;
      const nextFeatured =
        overrides.isFeatured !== undefined
          ? overrides.isFeatured
          : filters.isFeatured;
      const nextSort =
        overrides.sort !== undefined ? overrides.sort : sortOption;
      const nextPage = overrides.page !== undefined ? overrides.page : 1;

      const sp = new URLSearchParams();
      if (nextCategory) sp.set("category", nextCategory);
      if (nextBrand) sp.set("brand", nextBrand);
      if (nextSearch) sp.set("search", nextSearch);
      if (nextMin) sp.set("minPrice", nextMin);
      if (nextMax) sp.set("maxPrice", nextMax);
      if (nextInStock) sp.set("inStockOnly", "true");
      if (nextFeatured) sp.set("isFeatured", "true");
      if (nextSort && nextSort !== "newest") sp.set("sort", nextSort);
      if (nextPage > 1) sp.set("page", String(nextPage));

      const qs = sp.toString();
      router.push(qs ? `/shop?${qs}` : "/shop");
    },
    [router, activeCategory, filters, searchQuery, sortOption],
  );

  const handleClearAll = useCallback(() => {
    setMobileFiltersOpen(false);
    router.push("/shop");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F3]">
      <CatalogueHeader
        totalProducts={meta.total}
        activeCategoryName={activeCategoryName}
      />

      <CategoryNav
        categories={categories}
        activeCategorySlug={activeCategory}
        onSelectCategory={(slug) =>
          navigateWithParams({ category: slug, page: 1 })
        }
      />

      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 md:px-12 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Desktop Sticky Filter Rail */}
          <aside className="hidden lg:block lg:col-span-3 lg:border-r lg:border-white/10 lg:pr-8">
            <div className="sticky top-24">
              <FilterControls
                key={`${filters.minPriceDollars}:${filters.maxPriceDollars}`}
                brands={brands}
                filters={filters}
                activeFilterCount={activeFilterCount}
                onChangeFilters={(next) =>
                  navigateWithParams({ ...next, page: 1 })
                }
                onClearAll={handleClearAll}
              />
            </div>
          </aside>

          {/* Main Product Grid & Controls */}
          <div className="lg:col-span-9 flex flex-col">
            <CatalogueToolbar
              key={searchQuery}
              searchQuery={searchQuery}
              sortOption={sortOption}
              activeFilterCount={activeFilterCount}
              totalResults={meta.total}
              onSearchSubmit={(search) =>
                navigateWithParams({ search, page: 1 })
              }
              onSortChange={(sort) => navigateWithParams({ sort, page: 1 })}
              onOpenMobileFilters={() => setMobileFiltersOpen(true)}
            />

            {hasError ? (
              <div className="my-12 border border-[#C81E1E]/40 bg-[#0D0D0F] p-10 text-center space-y-4">
                <p className="font-serif text-2xl text-[#F5F5F3]">
                  Unable to load catalogue
                </p>
                <p className="text-sm text-zinc-400">
                  Please check your connection or try refreshing the page.
                </p>
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="btn-atelier cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="my-12 border border-white/10 bg-[#0D0D0F] bg-noise p-12 text-center space-y-4">
                <p className="font-serif text-3xl font-light text-[#F5F5F3]">
                  No matching hardware found
                </p>
                <p className="text-sm text-zinc-400 max-w-md mx-auto">
                  Try adjusting your brand, price range, or search terms to
                  explore the full APEX ATELIER allocation.
                </p>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="btn-atelier cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product, index) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    priority={index < 3}
                  />
                ))}
              </div>
            )}

            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              onPageChange={(page) => navigateWithParams({ page })}
            />
          </div>
        </div>
      </div>

      {/* Mobile Slide-Over Filter Drawer */}
      {mobileFiltersOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filter products"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative z-10 ml-auto w-full max-w-xs h-full bg-[#080808] border-l border-white/10 flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <span className="text-xs tracking-[0.24em] uppercase text-[#F5F5F3]">
                Filters
              </span>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="p-2 text-zinc-400 hover:text-[#F5F5F3] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <FilterControls
                key={`${filters.minPriceDollars}:${filters.maxPriceDollars}`}
                brands={brands}
                filters={filters}
                activeFilterCount={activeFilterCount}
                onChangeFilters={(next) => {
                  setMobileFiltersOpen(false);
                  navigateWithParams({ ...next, page: 1 });
                }}
                onClearAll={handleClearAll}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
