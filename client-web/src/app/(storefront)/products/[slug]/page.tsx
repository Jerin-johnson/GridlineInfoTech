import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/landing/Navbar";
import { ProductDetailSkeleton } from "@/components/product/ProductDetailSkeleton";
import { ProductErrorState } from "@/components/product/ProductErrorState";
import { ProductMediaGallery } from "@/components/product/ProductMediaGallery";
import { ProductPurchasePanel } from "@/components/product/ProductPurchasePanel";
import { ProductSpecsAndFitment } from "@/components/product/ProductSpecsAndFitment";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { ApiError } from "@/lib/api/client";
import { getProductBySlug, getRelatedProducts } from "@/lib/api/catalog.api";
import type { CatalogProduct } from "@/types/catalog.types";

type RouteParams = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    const brandName =
      typeof product.brand === "object" && product.brand !== null
        ? product.brand.name
        : "APEX ATELIER";
    return {
      title: `${product.name} | ${brandName} | APEX ATELIER`,
      description:
        product.description ||
        `${product.name} (${product.sku}) precision automotive performance hardware by ${brandName}.`,
    };
  } catch {
    return {
      title: "Hardware Specification | APEX ATELIER",
      description:
        "Precision automotive performance hardware at APEX ATELIER.",
    };
  }
}

async function ProductDetailContent({
  paramsPromise,
}: {
  paramsPromise: Promise<RouteParams>;
}) {
  const { slug } = await paramsPromise;

  let product: CatalogProduct;
  try {
    product = await getProductBySlug(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    return (
      <>
        <ProductErrorState />
        <ShopFooter />
      </>
    );
  }

  let relatedProducts: CatalogProduct[] = [];
  try {
    relatedProducts = await getRelatedProducts(product._id, 4);
  } catch {
    relatedProducts = [];
  }

  return (
    <>
      <main className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 pt-28 pb-20 space-y-16">
        {/* Asymmetric Product Showcase + Sticky Purchase Panel */}
        <section
          aria-label="Product overview"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start"
        >
          <div className="lg:col-span-7">
            <ProductMediaGallery product={product} />
          </div>
          <div className="lg:col-span-5">
            <ProductPurchasePanel product={product} />
          </div>
        </section>

        {/* Technical Specifications & Vehicle Fitment */}
        <ProductSpecsAndFitment product={product} />

        {/* Related Hardware */}
        {relatedProducts.length > 0 && (
          <section
            aria-labelledby="related-heading"
            className="pt-10 border-t border-[#222228] space-y-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] tracking-[0.24em] uppercase text-[#A1A1AA]">
                  Complementary Systems
                </p>
                <h2
                  id="related-heading"
                  className="font-serif text-2xl sm:text-3xl font-normal text-[#F5F5F3]"
                >
                  Related Hardware
                </h2>
              </div>
              <Link
                href="/shop"
                className="text-[11px] tracking-[0.22em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] transition-colors"
              >
                View Full Catalogue
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.slice(0, 4).map((related) => (
                <ProductCard key={related._id} product={related} />
              ))}
            </div>
          </section>
        )}
      </main>

      <ShopFooter />
    </>
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F3]">
      <Navbar showNavigateDrawer={false} />
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailContent paramsPromise={params} />
      </Suspense>
    </div>
  );
}
