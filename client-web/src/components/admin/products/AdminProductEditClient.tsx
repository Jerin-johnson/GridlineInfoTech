"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPrimitives";
import { AdminProductForm } from "@/components/admin/products/AdminProductForm";
import { getAdminProductById } from "@/lib/api/admin-products.api";
import { ApiError } from "@/lib/api/client";
import type { CatalogProduct } from "@/types/catalog.types";

export function AdminProductEditClient({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<CatalogProduct | null>(null);

  useEffect(() => {
    let active = true;
    getAdminProductById(productId)
      .then((data) => {
        if (active) setProduct(data);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace(
            `/login?redirect=${encodeURIComponent(`/admin/products/${productId}/edit`)}`,
          );
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/admin/unauthorized");
          return;
        }
        setError(
          err instanceof ApiError ? err.message : "Unable to load product.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId, router]);

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-10 w-56 bg-[#141417]" />
        <div className="h-80 border border-white/10 bg-[#0D0D0F]" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-8 max-w-lg space-y-4">
        <h1 className="font-serif text-2xl text-[#F5F5F3]">
          Product Unavailable
        </h1>
        <p className="text-sm text-[#A1A1AA]">
          {error || "Product not found."}
        </p>
        <Link
          href="/admin/products"
          className="inline-flex border border-white/15 px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3]"
        >
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="COMMERCE CATALOGUE"
        title={`Edit ${product.name}`}
        description={`SKU: ${product.sku}`}
      />
      <AdminProductForm mode="edit" initialProduct={product} />
    </div>
  );
}
