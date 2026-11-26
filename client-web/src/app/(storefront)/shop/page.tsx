import { Suspense } from "react";
import type { Metadata } from "next";
import { CinematicFooter } from "@/components/landing/CinematicFooter";
import { Navbar } from "@/components/landing/Navbar";
import { CatalogueClient } from "@/components/shop/CatalogueClient";
import { CatalogueSkeleton } from "@/components/shop/CatalogueSkeleton";
import {
  getBrands,
  getCategories,
  getProducts,
  mapSortOptionToQuery,
  resolveEntityIdBySlugOrId,
} from "@/lib/api/catalog.api";
import type {
  CatalogBrand,
  CatalogCategory,
  CatalogPaginationMeta,
  CatalogProduct,
  CatalogSortOption,
} from "@/types/catalog.types";

export const metadata: Metadata = {
  title: "Catalogue | APEX ATELIER",
  description:
    "Browse forged wheels, titanium exhaust systems, carbon-ceramic brakes, and dry-carbon aero hardware.",
};

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function readParam(
  params: SearchParamsRecord,
  key: string,
): string | undefined {
  const val = params[key];
  if (Array.isArray(val)) return val[0];
  return val;
}

function parseSort(raw?: string): CatalogSortOption {
  if (
    raw === "featured" ||
    raw === "newest" ||
    raw === "price_asc" ||
    raw === "price_desc"
  ) {
    return raw;
  }
  return "newest";
}

async function ShopContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<SearchParamsRecord>;
}) {
  const resolved = await searchParamsPromise;

  const activeCategoryParam = readParam(resolved, "category")?.trim() || "";
  const activeBrandParam = readParam(resolved, "brand")?.trim() || "";
  const searchQuery = readParam(resolved, "search")?.trim() || "";
  const minPriceDollars = readParam(resolved, "minPrice")?.trim() || "";
  const maxPriceDollars = readParam(resolved, "maxPrice")?.trim() || "";
  const inStockOnly = readParam(resolved, "inStockOnly") === "true";
  const isFeaturedFilter = readParam(resolved, "isFeatured") === "true";
  const sortOption = parseSort(readParam(resolved, "sort"));
  const parsedPage = Number(readParam(resolved, "page"));
  const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  let categories: CatalogCategory[] = [];
  let brands: CatalogBrand[] = [];
  let products: CatalogProduct[] = [];
  let meta: CatalogPaginationMeta = {
    page,
    limit: 12,
    total: 0,
    totalPages: 0,
  };
  let hasError = false;

  try {
    const [fetchedCategories, fetchedBrands] = await Promise.all([
      getCategories(),
      getBrands(),
    ]);
    categories = fetchedCategories;
    brands = fetchedBrands;

    const resolvedCategoryId = resolveEntityIdBySlugOrId(
      categories,
      activeCategoryParam,
    );
    const resolvedBrandId = resolveEntityIdBySlugOrId(brands, activeBrandParam);

    const minDollarsNum = Number(minPriceDollars);
    const maxDollarsNum = Number(maxPriceDollars);
    const minPriceCents =
      minPriceDollars && Number.isFinite(minDollarsNum) && minDollarsNum >= 0
        ? Math.round(minDollarsNum * 100)
        : undefined;
    const maxPriceCents =
      maxPriceDollars && Number.isFinite(maxDollarsNum) && maxDollarsNum >= 0
        ? Math.round(maxDollarsNum * 100)
        : undefined;

    const sortQuery = mapSortOptionToQuery(sortOption);

    const productsRes = await getProducts({
      page,
      limit: 12,
      search: searchQuery || undefined,
      category: resolvedCategoryId,
      brand: resolvedBrandId,
      minPrice: minPriceCents,
      maxPrice: maxPriceCents,
      inStockOnly: inStockOnly || undefined,
      isFeatured: isFeaturedFilter || sortQuery.isFeatured,
      sortBy: sortQuery.sortBy,
      sortOrder: sortQuery.sortOrder,
    });

    products = productsRes.data;
    meta = productsRes.meta;
  } catch {
    hasError = true;
  }

  const activeCategoryObj = categories.find(
    (c) =>
      c.slug.toLowerCase() === activeCategoryParam.toLowerCase() ||
      c._id === activeCategoryParam,
  );

  return (
    <>
      <CatalogueClient
        products={products}
        meta={meta}
        categories={categories}
        brands={brands}
        activeCategory={activeCategoryParam}
        activeCategoryName={activeCategoryObj?.name}
        searchQuery={searchQuery}
        sortOption={sortOption}
        filters={{
          brand: activeBrandParam,
          minPriceDollars,
          maxPriceDollars,
          inStockOnly,
          isFeatured: isFeaturedFilter,
        }}
        hasError={hasError}
      />

      <CinematicFooter
        categories={categories.map((c) => ({
          id: c._id,
          name: c.name,
          slug: c.slug,
          description: c.description ?? "",
          image: c.image ?? "",
          productCount: 0,
        }))}
      />
    </>
  );
}

export default function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F3]">
      <Navbar />
      <Suspense fallback={<CatalogueSkeleton />}>
        <ShopContent searchParamsPromise={searchParams} />
      </Suspense>
    </div>
  );
}
