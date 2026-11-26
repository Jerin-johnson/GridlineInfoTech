"use client";

import type { CatalogCategory } from "@/types/catalog.types";

interface CategoryNavProps {
  categories: CatalogCategory[];
  activeCategorySlug: string;
  onSelectCategory: (slug: string) => void;
}

export function CategoryNav({
  categories,
  activeCategorySlug,
  onSelectCategory,
}: CategoryNavProps) {
  return (
    <nav
      aria-label="Product categories"
      className="border-b border-white/10 bg-[#080808]"
    >
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 md:px-12 flex items-center gap-6 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => onSelectCategory("")}
          aria-current={!activeCategorySlug ? "page" : undefined}
          className={`relative py-4 text-[11px] tracking-[0.22em] uppercase whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70 ${
            !activeCategorySlug
              ? "text-[#F5F5F3]"
              : "text-zinc-500 hover:text-zinc-200"
          }`}
        >
          <span>All Hardware</span>
          {!activeCategorySlug && (
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C81E1E]"
            />
          )}
        </button>

        {categories.map((category) => {
          const isActive =
            activeCategorySlug.toLowerCase() === category.slug.toLowerCase() ||
            activeCategorySlug === category._id;

          return (
            <button
              key={category._id}
              type="button"
              onClick={() => onSelectCategory(category.slug)}
              aria-current={isActive ? "page" : undefined}
              className={`relative py-4 text-[11px] tracking-[0.22em] uppercase whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70 ${
                isActive
                  ? "text-[#F5F5F3]"
                  : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              <span>{category.name}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C81E1E]"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
