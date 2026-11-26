"use client";

import { useState } from "react";
import type { CatalogBrand } from "@/types/catalog.types";

export interface FilterState {
  brand: string;
  minPriceDollars: string;
  maxPriceDollars: string;
  inStockOnly: boolean;
  isFeatured: boolean;
}

interface FilterControlsProps {
  brands: CatalogBrand[];
  filters: FilterState;
  activeFilterCount: number;
  onChangeFilters: (next: Partial<FilterState>) => void;
  onClearAll: () => void;
}

export function FilterControls({
  brands,
  filters,
  activeFilterCount,
  onChangeFilters,
  onClearAll,
}: FilterControlsProps) {
  const [minDraft, setMinDraft] = useState(filters.minPriceDollars);
  const [maxDraft, setMaxDraft] = useState(filters.maxPriceDollars);

  const handleApplyPrice = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeFilters({
      minPriceDollars: minDraft.trim(),
      maxPriceDollars: maxDraft.trim(),
    });
  };

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <span className="text-[10px] tracking-[0.26em] uppercase text-zinc-400">
          Refine Selection
        </span>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setMinDraft("");
              setMaxDraft("");
              onClearAll();
            }}
            className="text-[10px] tracking-[0.2em] uppercase text-[#C81E1E] hover:text-[#F5F5F3] transition-colors cursor-pointer"
          >
            Clear ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Brand Filter */}
      <div className="space-y-3">
        <p className="text-[10px] tracking-[0.24em] uppercase text-zinc-500">
          Brand
        </p>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => onChangeFilters({ brand: "" })}
            className={`w-full text-left px-3 py-2 text-xs border transition-colors cursor-pointer ${
              !filters.brand
                ? "border-white/30 bg-[#141417] text-[#F5F5F3]"
                : "border-transparent text-zinc-400 hover:text-[#F5F5F3] hover:bg-[#0D0D0F]"
            }`}
          >
            All Brands
          </button>
          {brands.map((brand) => {
            const isSelected =
              filters.brand.toLowerCase() === brand.slug.toLowerCase() ||
              filters.brand === brand._id;

            return (
              <button
                key={brand._id}
                type="button"
                onClick={() =>
                  onChangeFilters({ brand: isSelected ? "" : brand.slug })
                }
                className={`w-full text-left px-3 py-2 text-xs border transition-colors cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? "border-white/30 bg-[#141417] text-[#F5F5F3]"
                    : "border-transparent text-zinc-400 hover:text-[#F5F5F3] hover:bg-[#0D0D0F]"
                }`}
              >
                <span>{brand.name}</span>
                {isSelected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C81E1E]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range (USD) */}
      <form onSubmit={handleApplyPrice} className="space-y-3">
        <p className="text-[10px] tracking-[0.24em] uppercase text-zinc-500">
          Price Range (USD)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="filter-min-price" className="sr-only">
              Minimum price in USD
            </label>
            <input
              id="filter-min-price"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Min $"
              value={minDraft}
              onChange={(e) => setMinDraft(e.target.value)}
              className="w-full rounded-none bg-[#141417] border border-white/15 px-3 py-2 text-xs text-[#F5F5F3] placeholder:text-zinc-600 focus:border-white/50 focus:outline-none tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="filter-max-price" className="sr-only">
              Maximum price in USD
            </label>
            <input
              id="filter-max-price"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Max $"
              value={maxDraft}
              onChange={(e) => setMaxDraft(e.target.value)}
              className="w-full rounded-none bg-[#141417] border border-white/15 px-3 py-2 text-xs text-[#F5F5F3] placeholder:text-zinc-600 focus:border-white/50 focus:outline-none tabular-nums"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full rounded-none border border-white/15 bg-[#0D0D0F] py-2 text-[10px] tracking-[0.22em] uppercase text-zinc-300 hover:border-white/40 hover:text-[#F5F5F3] transition-colors cursor-pointer"
        >
          Apply Price
        </button>
      </form>

      {/* Availability & Featured Toggles */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <label className="flex items-center justify-between gap-3 py-1 cursor-pointer group">
          <span className="text-xs text-zinc-300 group-hover:text-[#F5F5F3] transition-colors">
            In stock only
          </span>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) =>
              onChangeFilters({ inStockOnly: e.target.checked })
            }
            className="h-4 w-4 accent-[#C81E1E] cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between gap-3 py-1 cursor-pointer group">
          <span className="text-xs text-zinc-300 group-hover:text-[#F5F5F3] transition-colors">
            Featured allocations
          </span>
          <input
            type="checkbox"
            checked={filters.isFeatured}
            onChange={(e) =>
              onChangeFilters({ isFeatured: e.target.checked })
            }
            className="h-4 w-4 accent-[#C81E1E] cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}
