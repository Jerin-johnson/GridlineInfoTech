"use client";

import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";
import type { ProductSummary } from "@/types/store-front.types";

export function FeaturedCatalogue({
  products,
}: {
  products: ProductSummary[];
}) {
  return (
    <section className="relative w-full bg-[#080808] border-t border-white/10 py-28 px-6 md:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <p className="text-[10px] tracking-[0.28em] uppercase text-[#C81E1E] mb-3">
              Ready For Immediate Dispatch
            </p>
            <h2 className="font-serif text-5xl md:text-7xl font-light text-[#F5F5F3]">
              Available Stock
            </h2>
          </div>
          <Link href="/shop" className="btn-atelier">
            <span>View Full Catalogue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="border border-white/10 p-16 text-center text-zinc-400 text-sm">
            No featured parts currently in stock. Check back soon or browse the
            full catalogue.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <article
                key={product.id}
                className="group flex flex-col border border-white/10 bg-[#0D0D0F] hover:border-white/30 transition-colors"
              >
                <Link
                  href={`/products/${product.slug}`}
                  className="relative aspect-[4/3] overflow-hidden bg-black"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <span className="absolute top-3 left-3 text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 bg-black/75 border border-white/10 text-zinc-200">
                    {product.stock > 0
                      ? `${product.stock} In Stock`
                      : "Out of Stock"}
                  </span>
                </Link>

                <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                  <div>
                    <p className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">
                      {product.brandName} · {product.categoryName}
                    </p>
                    <Link
                      href={`/products/${product.slug}`}
                      className="block mt-1.5 font-serif text-2xl font-light text-[#F5F5F3] group-hover:text-white leading-snug"
                    >
                      {product.name}
                    </Link>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {product.fitment}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      ${product.price.toLocaleString()}
                    </span>
                    <Link
                      href={`/products/${product.slug}`}
                      className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-zinc-300 hover:text-white transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Configure</span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
