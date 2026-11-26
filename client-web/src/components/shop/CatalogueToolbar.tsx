"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { CatalogSortOption } from "@/types/catalog.types";

interface CatalogueToolbarProps {
  searchQuery: string;
  sortOption: CatalogSortOption;
  activeFilterCount: number;
  totalResults: number;
  onSearchSubmit: (search: string) => void;
  onSortChange: (sort: CatalogSortOption) => void;
  onOpenMobileFilters: () => void;
}

export function CatalogueToolbar({
  searchQuery,
  sortOption,
  activeFilterCount,
  totalResults,
  onSearchSubmit,
  onSortChange,
  onOpenMobileFilters,
}: CatalogueToolbarProps) {
  const [searchDraft, setSearchDraft] = useState(searchQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(searchDraft.trim());
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-white/10">
      {/* Search Bar */}
      <form
        onSubmit={handleSubmit}
        className="relative flex-1 max-w-md flex items-center"
      >
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
        <input
          type="search"
          aria-label="Search products by name or SKU"
          placeholder="Search by part name or SKU..."
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          className="w-full rounded-none bg-[#141417] border border-white/15 pl-10 pr-16 py-2.5 text-sm text-[#F5F5F3] placeholder:text-zinc-600 focus:border-white/50 focus:outline-none transition-colors"
        />
        {searchDraft && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setSearchDraft("");
              onSearchSubmit("");
            }}
            className="absolute right-2 p-1.5 text-zinc-500 hover:text-[#F5F5F3] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {/* Controls: Mobile Filter Button + Sort Dropdown */}
      <div className="flex items-center justify-between sm:justify-end gap-3">
        <button
          type="button"
          onClick={onOpenMobileFilters}
          className="lg:hidden inline-flex items-center gap-2 rounded-none border border-white/15 bg-[#0D0D0F] px-4 py-2.5 text-[10px] tracking-[0.22em] uppercase text-[#F5F5F3] hover:border-white/40 transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#C81E1E]" />
          <span>
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </span>
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden xl:inline text-xs text-zinc-500 tabular-nums">
            {totalResults} results
          </span>
          <label htmlFor="catalogue-sort" className="sr-only">
            Sort products
          </label>
          <select
            id="catalogue-sort"
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as CatalogSortOption)}
            className="rounded-none bg-[#141417] border border-white/15 px-3.5 py-2.5 text-[11px] tracking-[0.18em] uppercase text-[#F5F5F3] focus:border-white/50 focus:outline-none cursor-pointer"
          >
            <option value="newest">Sort: Newest</option>
            <option value="featured">Sort: Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>
    </div>
  );
}
