"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminBrandForm } from "@/components/admin/brands/AdminBrandForm";
import { getAdminBrandById } from "@/lib/api/admin-brands.api";
import { ApiError } from "@/lib/api/client";
import type { CatalogBrand } from "@/types/catalog.types";

function EditBrandContent() {
  const params = useParams<{ brandId: string }>();
  const router = useRouter();
  const brandId = params.brandId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<CatalogBrand | null>(null);

  useEffect(() => {
    if (!brandId) return;
    let active = true;
    getAdminBrandById(brandId)
      .then((data) => {
        if (active) setBrand(data);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace(
            `/login?redirect=${encodeURIComponent(`/admin/brands/${brandId}/edit`)}`,
          );
          return;
        }
        setError(err instanceof ApiError ? err.message : "Brand not found.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [brandId, router]);

  if (loading) {
    return <div className="h-64 border border-white/10 bg-[#0D0D0F]" />;
  }

  if (error || !brand) {
    return (
      <div className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-8 max-w-lg space-y-4">
        <h1 className="font-serif text-2xl text-[#F5F5F3]">
          Brand Unavailable
        </h1>
        <p className="text-sm text-[#A1A1AA]">{error || "Brand not found."}</p>
        <Link
          href="/admin/brands"
          className="inline-flex border border-white/15 px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3]"
        >
          Back to Brands
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="COMMERCE TAXONOMY"
        title={`Edit ${brand.name}`}
        description={`Slug: ${brand.slug}`}
      />
      <AdminBrandForm mode="edit" initialBrand={brand} />
    </div>
  );
}

export default function AdminEditBrandPage() {
  return (
    <AdminShell pageTitle="Edit Brand">
      <Suspense fallback={<div className="h-64 bg-[#0D0D0F]" />}>
        <EditBrandContent />
      </Suspense>
    </AdminShell>
  );
}
