"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminCategoryForm } from "@/components/admin/categories/AdminCategoryForm";
import { getAdminCategoryById } from "@/lib/api/admin-categories.api";
import { ApiError } from "@/lib/api/client";
import type { CatalogCategory } from "@/types/catalog.types";

function EditCategoryContent() {
  const params = useParams<{ categoryId: string }>();
  const router = useRouter();
  const categoryId = params.categoryId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CatalogCategory | null>(null);

  useEffect(() => {
    if (!categoryId) return;
    let active = true;
    getAdminCategoryById(categoryId)
      .then((data) => {
        if (active) setCategory(data);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace(
            `/login?redirect=${encodeURIComponent(`/admin/categories/${categoryId}/edit`)}`,
          );
          return;
        }
        setError(err instanceof ApiError ? err.message : "Category not found.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [categoryId, router]);

  if (loading) {
    return <div className="h-64 border border-white/10 bg-[#0D0D0F]" />;
  }

  if (error || !category) {
    return (
      <div className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-6 space-y-4">
        <p className="text-sm text-[#A1A1AA]">
          {error ?? "Category not found."}
        </p>
        <Link
          href="/admin/categories"
          className="inline-flex items-center border border-white/15 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]"
        >
          Back to Categories
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="COMMERCE TAXONOMY"
        title={`Edit · ${category.name}`}
        description={`Slug: ${category.slug}`}
      />
      <AdminCategoryForm mode="edit" initialCategory={category} />
    </div>
  );
}

export default function AdminEditCategoryPage() {
  return (
    <AdminShell pageTitle="Edit Category">
      <Suspense fallback={<div className="h-64 bg-[#0D0D0F]" />}>
        <EditCategoryContent />
      </Suspense>
    </AdminShell>
  );
}
