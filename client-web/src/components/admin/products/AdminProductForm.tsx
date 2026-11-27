"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { AdminPanel } from "@/components/admin/AdminPrimitives";
import {
  createAdminProduct,
  removeAdminProductImage,
  updateAdminProduct,
  uploadAdminProductImage,
} from "@/lib/api/admin-products.api";
import { getAdminBrands } from "@/lib/api/admin-brands.api";
import { getAdminCategories } from "@/lib/api/admin-categories.api";
import { ApiError } from "@/lib/api/client";
import type {
  CatalogBrand,
  CatalogCategory,
  CatalogCompatibility,
  CatalogImage,
  CatalogProduct,
  CatalogSpecification,
} from "@/types/catalog.types";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

interface QueuedImageFile {
  id: string;
  file: File;
  previewUrl: string;
  alt: string;
  isPrimary: boolean;
}

interface AdminProductFormProps {
  mode: "create" | "edit";
  initialProduct?: CatalogProduct;
}

export function AdminProductForm({
  mode,
  initialProduct,
}: AdminProductFormProps) {
  const router = useRouter();

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [brands, setBrands] = useState<CatalogBrand[]>([]);
  const [loadingTaxonomies, setLoadingTaxonomies] = useState(true);

  const [name, setName] = useState(initialProduct?.name ?? "");
  const [sku, setSku] = useState(initialProduct?.sku ?? "");
  const [slug, setSlug] = useState(initialProduct?.slug ?? "");
  const [description, setDescription] = useState(
    initialProduct?.description ?? "",
  );
  const [categoryId, setCategoryId] = useState(
    typeof initialProduct?.category === "object" && initialProduct.category
      ? initialProduct.category._id
      : typeof initialProduct?.category === "string"
        ? initialProduct.category
        : "",
  );
  const [brandId, setBrandId] = useState(
    typeof initialProduct?.brand === "object" && initialProduct.brand
      ? initialProduct.brand._id
      : typeof initialProduct?.brand === "string"
        ? initialProduct.brand
        : "",
  );

  const [priceDollars, setPriceDollars] = useState(
    initialProduct ? (initialProduct.price / 100).toFixed(2) : "",
  );
  const [compareAtDollars, setCompareAtDollars] = useState(
    initialProduct?.compareAtPrice !== undefined
      ? (initialProduct.compareAtPrice / 100).toFixed(2)
      : "",
  );

  const [stock, setStock] = useState(
    initialProduct !== undefined ? String(initialProduct.stock) : "0",
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    initialProduct !== undefined
      ? String(initialProduct.lowStockThreshold)
      : "5",
  );
  const [status, setStatus] = useState<
    "draft" | "published" | "out_of_stock" | "archived"
  >(initialProduct?.status ?? "published");
  const [isFeatured, setIsFeatured] = useState(
    initialProduct?.isFeatured ?? false,
  );

  const [images, setImages] = useState<CatalogImage[]>(
    initialProduct?.images ?? [],
  );
  const [queuedFiles, setQueuedFiles] = useState<QueuedImageFile[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [specifications, setSpecifications] = useState<CatalogSpecification[]>(
    initialProduct?.specifications ?? [],
  );
  const [compatibility, setCompatibility] = useState<CatalogCompatibility[]>(
    initialProduct?.compatibility ?? [],
  );

  const [isDirty, setIsDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const initialCategoryId =
    typeof initialProduct?.category === "object" && initialProduct.category
      ? initialProduct.category._id
      : typeof initialProduct?.category === "string"
        ? initialProduct.category
        : "";
  const initialBrandId =
    typeof initialProduct?.brand === "object" && initialProduct.brand
      ? initialProduct.brand._id
      : typeof initialProduct?.brand === "string"
        ? initialProduct.brand
        : "";

  useEffect(() => {
    let active = true;

    Promise.all([
      getAdminCategories({ status: "all" }),
      getAdminBrands({ status: "all" }),
    ])
      .then(([catRes, brandRes]) => {
        if (!active) return;
        const visibleCategories = catRes.data.filter(
          (c) => c.status === "active" || c._id === initialCategoryId,
        );
        const visibleBrands = brandRes.data.filter(
          (b) => b.status === "active" || b._id === initialBrandId,
        );
        setCategories(visibleCategories);
        setBrands(visibleBrands);
        setTaxonomyError(null);
        setCategoryId((prev) => prev || visibleCategories[0]?._id || "");
        setBrandId((prev) => prev || visibleBrands[0]?._id || "");
      })
      .catch((err) => {
        if (!active) return;
        setTaxonomyError(
          err instanceof ApiError
            ? err.message
            : "Unable to load categories and brands.",
        );
      })
      .finally(() => {
        if (active) setLoadingTaxonomies(false);
      });

    return () => {
      active = false;
    };
  }, [initialBrandId, initialCategoryId]);

  // Warn on unsaved changes when leaving page
  useEffect(() => {
    if (!isDirty || submitting) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, submitting]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleFileSelection = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setImageError(null);
    const files = Array.from(fileList);

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setImageError("Only JPEG, PNG, and WebP images are supported.");
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError(`"${file.name}" exceeds the 5 MB upload limit.`);
        continue;
      }

      if (mode === "edit" && initialProduct) {
        setUploadingImage(true);
        try {
          const updated = await uploadAdminProductImage(
            initialProduct._id,
            file,
            name.trim() || initialProduct.name,
            images.length === 0,
          );
          setImages(updated.images ?? []);
          setFormSuccess(`Uploaded "${file.name}" to Cloudinary.`);
        } catch (err) {
          setImageError(
            err instanceof ApiError
              ? err.message
              : `Failed to upload "${file.name}".`,
          );
        } finally {
          setUploadingImage(false);
        }
      } else {
        const previewUrl = URL.createObjectURL(file);
        setQueuedFiles((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            previewUrl,
            alt: name.trim(),
            isPrimary: prev.length === 0 && images.length === 0,
          },
        ]);
        markDirty();
      }
    }

    e.target.value = "";
  };

  const handleSetPrimaryExisting = (idx: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isPrimary: i === idx,
      })),
    );
    markDirty();
  };

  const handleMoveExisting = (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return next.map((img, i) => ({ ...img, sortOrder: i }));
    });
    markDirty();
  };

  const handleRemoveExistingImage = async (idx: number) => {
    const target = images[idx];
    if (!target) return;
    setImageError(null);

    if (mode === "edit" && initialProduct && target.publicId) {
      setUploadingImage(true);
      try {
        const updated = await removeAdminProductImage(
          initialProduct._id,
          target.publicId,
        );
        setImages(updated.images ?? []);
        setFormSuccess("Image removed.");
      } catch (err) {
        setImageError(
          err instanceof ApiError ? err.message : "Unable to remove image.",
        );
      } finally {
        setUploadingImage(false);
      }
      return;
    }

    setImages((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((img, i) => ({
          ...img,
          sortOrder: i,
          isPrimary: i === 0 ? true : img.isPrimary,
        })),
    );
    markDirty();
  };

  const handleRemoveQueuedFile = (id: string) => {
    setQueuedFiles((prev) => {
      const target = prev.find((q) => q.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const filtered = prev.filter((q) => q.id !== id);
      if (filtered.length > 0 && !filtered.some((f) => f.isPrimary)) {
        filtered[0] = { ...filtered[0], isPrimary: true };
      }
      return filtered;
    });
    markDirty();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setFormError(null);
    setFormSuccess(null);

    const parsedPrice = Number(priceDollars);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormError("Price must be a valid non-negative dollar amount.");
      return;
    }

    let parsedCompareAt: number | undefined;
    if (compareAtDollars.trim() !== "") {
      const val = Number(compareAtDollars);
      if (!Number.isFinite(val) || val < 0) {
        setFormError("Compare-at price must be a valid non-negative amount.");
        return;
      }
      parsedCompareAt = Math.round(val * 100);
    }

    const parsedStock = Math.floor(Number(stock));
    const parsedThreshold = Math.floor(Number(lowStockThreshold));
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setFormError("Stock quantity must be a non-negative integer.");
      return;
    }
    if (!Number.isInteger(parsedThreshold) || parsedThreshold < 0) {
      setFormError("Low-stock threshold must be a non-negative integer.");
      return;
    }

    if (!categoryId || !brandId) {
      setFormError("Category and Brand are required.");
      return;
    }

    const cleanSpecs = specifications
      .filter((s) => s.key.trim() && s.value.trim())
      .map((s) => ({ key: s.key.trim(), value: s.value.trim() }));

    const cleanCompatibility = compatibility
      .filter((c) => c.make.trim() && c.model.trim())
      .map((c) => ({
        make: c.make.trim(),
        model: c.model.trim(),
        yearFrom: Number(c.yearFrom) || 2020,
        yearTo: Number(c.yearTo) || 2025,
        ...(c.notes?.trim() ? { notes: c.notes.trim() } : {}),
      }));

    const payload = {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      ...(slug.trim() ? { slug: slug.trim().toLowerCase() } : {}),
      description: description.trim() || undefined,
      category: categoryId,
      brand: brandId,
      price: Math.round(parsedPrice * 100),
      ...(parsedCompareAt !== undefined
        ? { compareAtPrice: parsedCompareAt }
        : {}),
      currency: "USD",
      images: images.map((img, idx) => ({ ...img, sortOrder: idx })),
      specifications: cleanSpecs,
      compatibility: cleanCompatibility,
      stock: parsedStock,
      lowStockThreshold: parsedThreshold,
      status,
      isFeatured,
    };

    setSubmitting(true);
    try {
      if (mode === "create") {
        let created = await createAdminProduct(payload);

        for (const q of queuedFiles) {
          created = await uploadAdminProductImage(
            created._id,
            q.file,
            q.alt || created.name,
            q.isPrimary,
          );
          URL.revokeObjectURL(q.previewUrl);
        }

        setIsDirty(false);
        router.push(`/admin/products/${created._id}`);
        router.refresh();
      } else if (initialProduct) {
        const updated = await updateAdminProduct(initialProduct._id, payload);
        setImages(updated.images ?? []);
        setIsDirty(false);
        setFormSuccess(`Saved changes to ${updated.name}.`);
        router.refresh();
      }
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Unable to save product. Please verify your inputs.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={
            mode === "edit" && initialProduct
              ? `/admin/products/${initialProduct._id}`
              : "/admin/products"
          }
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3]"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          {mode === "edit" ? "Back to Product" : "Back to Products"}
        </Link>

        <button
          type="submit"
          disabled={submitting || uploadingImage || loadingTaxonomies}
          className="bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium transition-colors cursor-pointer min-h-[44px] disabled:opacity-60"
        >
          {submitting
            ? mode === "create"
              ? "Creating Product..."
              : "Saving Changes..."
            : mode === "create"
              ? "Create Product"
              : "Save Changes"}
        </button>
      </div>

      {formError && (
        <div
          role="alert"
          className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-4 flex items-start gap-2.5 text-xs text-[#F5F5F3]"
        >
          <AlertCircle
            className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div
          role="status"
          className="border border-emerald-500/40 bg-[#0D0D0F] p-4 flex items-center gap-2.5 text-xs text-emerald-400"
        >
          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{formSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 cols */}
        <div className="lg:col-span-8 space-y-6">
          <AdminPanel title="Product Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1.5 text-xs sm:col-span-2">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Product Name *
                </span>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    markDirty();
                  }}
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  SKU *
                </span>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={sku}
                  onChange={(e) => {
                    setSku(e.target.value);
                    markDirty();
                  }}
                  placeholder="BBS-FIR-20X95"
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3.5 text-sm text-[#F5F5F3] uppercase focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Slug (Optional, auto-generated if empty)
                </span>
                <input
                  type="text"
                  maxLength={200}
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    markDirty();
                  }}
                  placeholder="bbs-fi-r-20x95"
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3.5 text-sm text-[#F5F5F3] lowercase focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="product-category-select"
                    className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA]"
                  >
                    Category *
                  </label>
                  <Link
                    href="/admin/categories/new"
                    className="text-[10px] tracking-[0.14em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3]"
                  >
                    + New Category
                  </Link>
                </div>
                <select
                  id="product-category-select"
                  required
                  disabled={loadingTaxonomies || categories.length === 0}
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    markDirty();
                  }}
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3] disabled:opacity-60"
                >
                  {loadingTaxonomies ? (
                    <option value="">Loading categories...</option>
                  ) : categories.length === 0 ? (
                    <option value="">No active categories</option>
                  ) : (
                    categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                        {cat.status === "inactive" ? " (Inactive)" : ""}
                      </option>
                    ))
                  )}
                </select>
                {!loadingTaxonomies && categories.length === 0 && (
                  <p className="text-[11px] text-[#C81E1E]">
                    No active categories found.{" "}
                    <Link
                      href="/admin/categories/new"
                      className="underline text-[#F5F5F3]"
                    >
                      Create Category
                    </Link>
                  </p>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="product-brand-select"
                    className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA]"
                  >
                    Brand *
                  </label>
                  <Link
                    href="/admin/brands/new"
                    className="text-[10px] tracking-[0.14em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3]"
                  >
                    + New Brand
                  </Link>
                </div>
                <select
                  id="product-brand-select"
                  required
                  disabled={loadingTaxonomies || brands.length === 0}
                  value={brandId}
                  onChange={(e) => {
                    setBrandId(e.target.value);
                    markDirty();
                  }}
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3] disabled:opacity-60"
                >
                  {loadingTaxonomies ? (
                    <option value="">Loading brands...</option>
                  ) : brands.length === 0 ? (
                    <option value="">No active brands</option>
                  ) : (
                    brands.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                        {b.status === "inactive" ? " (Inactive)" : ""}
                      </option>
                    ))
                  )}
                </select>
                {!loadingTaxonomies && brands.length === 0 && (
                  <p className="text-[11px] text-[#C81E1E]">
                    No active brands found.{" "}
                    <Link
                      href="/admin/brands/new"
                      className="underline text-[#F5F5F3]"
                    >
                      Create Brand
                    </Link>
                  </p>
                )}
              </div>

              {taxonomyError && (
                <p
                  role="alert"
                  className="sm:col-span-2 text-xs text-[#C81E1E]"
                >
                  {taxonomyError}
                </p>
              )}

              <label className="space-y-1.5 text-xs sm:col-span-2">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Description
                </span>
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    markDirty();
                  }}
                  className="w-full bg-[#141417] border border-white/15 p-3.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>
            </div>
          </AdminPanel>

          {/* Media & Cloudinary Upload */}
          <AdminPanel
            title="Product Images"
            subtitle="JPEG, PNG, or WebP up to 5 MB · Stored via Cloudinary"
          >
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center border border-dashed border-white/20 bg-[#080808] p-6 text-center cursor-pointer hover:border-white/40 transition-colors">
                <Upload
                  className="w-5 h-5 text-[#A1A1AA] mb-2"
                  aria-hidden="true"
                />
                <span className="text-xs text-[#F5F5F3]">
                  {uploadingImage
                    ? "Uploading to Cloudinary..."
                    : "Select image file(s) to upload"}
                </span>
                <span className="text-[11px] text-[#71717A] mt-1">
                  {mode === "create"
                    ? "Files will upload automatically right after product creation"
                    : "Files upload immediately to this product"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={uploadingImage}
                  onChange={(e) => void handleFileSelection(e)}
                  className="sr-only"
                />
              </label>

              {imageError && (
                <p role="alert" className="text-xs text-[#C81E1E]">
                  {imageError}
                </p>
              )}

              {(images.length > 0 || queuedFiles.length > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {images.map((img, idx) => (
                    <div
                      key={`${img.url}-${idx}`}
                      className={`border bg-[#080808] p-2 space-y-2 ${
                        img.isPrimary ? "border-[#C81E1E]" : "border-white/10"
                      }`}
                    >
                      <div className="relative aspect-[4/3] bg-[#141417] overflow-hidden">
                        <Image
                          src={img.url}
                          alt={img.alt || name || "Product image"}
                          fill
                          unoptimized
                          sizes="200px"
                          className="object-contain p-1"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryExisting(idx)}
                          title="Set primary image"
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[9px] tracking-[0.14em] uppercase cursor-pointer ${
                            img.isPrimary
                              ? "text-[#C81E1E] font-medium"
                              : "text-[#A1A1AA] hover:text-[#F5F5F3]"
                          }`}
                        >
                          <Star className="w-3 h-3" aria-hidden="true" />
                          {img.isPrimary ? "Primary" : "Set Primary"}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveExisting(idx, -1)}
                            aria-label="Move image left"
                            className="p-1 text-[#A1A1AA] hover:text-[#F5F5F3] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === images.length - 1}
                            onClick={() => handleMoveExisting(idx, 1)}
                            aria-label="Move image right"
                            className="p-1 text-[#A1A1AA] hover:text-[#F5F5F3] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRemoveExistingImage(idx)}
                            aria-label="Remove image"
                            className="p-1 text-[#A1A1AA] hover:text-[#C81E1E] cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {queuedFiles.map((q) => (
                    <div
                      key={q.id}
                      className={`border bg-[#080808] p-2 space-y-2 ${
                        q.isPrimary ? "border-[#C81E1E]" : "border-white/10"
                      }`}
                    >
                      <div className="relative aspect-[4/3] bg-[#141417] overflow-hidden">
                        <Image
                          src={q.previewUrl}
                          alt={q.file.name}
                          fill
                          unoptimized
                          sizes="200px"
                          className="object-contain p-1"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] tracking-[0.14em] uppercase text-[#A1A1AA] truncate">
                          Queued · {q.isPrimary ? "Primary" : "Gallery"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQueuedFile(q.id)}
                          aria-label={`Remove ${q.file.name}`}
                          className="p-1 text-[#A1A1AA] hover:text-[#C81E1E] cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AdminPanel>

          {/* Specifications */}
          <AdminPanel
            title="Technical Specifications"
            actions={
              <button
                type="button"
                onClick={() => {
                  setSpecifications((p) => [...p, { key: "", value: "" }]);
                  markDirty();
                }}
                className="inline-flex items-center gap-1 border border-white/15 px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] hover:border-white/40 cursor-pointer"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                Add Spec
              </button>
            }
          >
            {specifications.length === 0 ? (
              <p className="text-xs text-[#71717A]">
                No technical specifications added yet.
              </p>
            ) : (
              <div className="space-y-3">
                {specifications.map((spec, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <input
                      type="text"
                      value={spec.key}
                      placeholder="Key (e.g. Material)"
                      onChange={(e) => {
                        setSpecifications((p) =>
                          p.map((s, i) =>
                            i === idx ? { ...s, key: e.target.value } : s,
                          ),
                        );
                        markDirty();
                      }}
                      className="sm:col-span-5 h-10 bg-[#141417] border border-white/15 px-3 text-xs text-[#F5F5F3]"
                    />
                    <input
                      type="text"
                      value={spec.value}
                      placeholder="Value (e.g. Forged 6061-T6)"
                      onChange={(e) => {
                        setSpecifications((p) =>
                          p.map((s, i) =>
                            i === idx ? { ...s, value: e.target.value } : s,
                          ),
                        );
                        markDirty();
                      }}
                      className="sm:col-span-6 h-10 bg-[#141417] border border-white/15 px-3 text-xs text-[#F5F5F3]"
                    />
                    <button
                      type="button"
                      aria-label="Remove specification"
                      onClick={() => {
                        setSpecifications((p) =>
                          p.filter((_, i) => i !== idx),
                        );
                        markDirty();
                      }}
                      className="sm:col-span-1 h-10 flex items-center justify-center border border-white/10 text-[#A1A1AA] hover:text-[#C81E1E] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          {/* Vehicle Compatibility */}
          <AdminPanel
            title="Vehicle Compatibility"
            actions={
              <button
                type="button"
                onClick={() => {
                  setCompatibility((p) => [
                    ...p,
                    {
                      make: "",
                      model: "",
                      yearFrom: 2020,
                      yearTo: 2025,
                      notes: "",
                    },
                  ]);
                  markDirty();
                }}
                className="inline-flex items-center gap-1 border border-white/15 px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-[#F5F5F3] hover:border-white/40 cursor-pointer"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                Add Fitment
              </button>
            }
          >
            {compatibility.length === 0 ? (
              <p className="text-xs text-[#71717A]">
                No chassis fitment entries added yet.
              </p>
            ) : (
              <div className="space-y-3">
                {compatibility.map((fit, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center border border-white/10 bg-[#080808] p-3"
                  >
                    <input
                      type="text"
                      value={fit.make}
                      placeholder="Make (Porsche)"
                      onChange={(e) => {
                        setCompatibility((p) =>
                          p.map((c, i) =>
                            i === idx ? { ...c, make: e.target.value } : c,
                          ),
                        );
                        markDirty();
                      }}
                      className="sm:col-span-3 h-10 bg-[#141417] border border-white/15 px-3 text-xs text-[#F5F5F3]"
                    />
                    <input
                      type="text"
                      value={fit.model}
                      placeholder="Model (911 GT3)"
                      onChange={(e) => {
                        setCompatibility((p) =>
                          p.map((c, i) =>
                            i === idx ? { ...c, model: e.target.value } : c,
                          ),
                        );
                        markDirty();
                      }}
                      className="sm:col-span-3 h-10 bg-[#141417] border border-white/15 px-3 text-xs text-[#F5F5F3]"
                    />
                    <input
                      type="number"
                      min={1950}
                      max={2040}
                      value={fit.yearFrom}
                      onChange={(e) => {
                        setCompatibility((p) =>
                          p.map((c, i) =>
                            i === idx
                              ? { ...c, yearFrom: Number(e.target.value) }
                              : c,
                          ),
                        );
                        markDirty();
                      }}
                      className="sm:col-span-2 h-10 bg-[#141417] border border-white/15 px-2.5 text-xs text-[#F5F5F3] tabular-nums"
                    />
                    <input
                      type="number"
                      min={1950}
                      max={2040}
                      value={fit.yearTo}
                      onChange={(e) => {
                        setCompatibility((p) =>
                          p.map((c, i) =>
                            i === idx
                              ? { ...c, yearTo: Number(e.target.value) }
                              : c,
                          ),
                        );
                        markDirty();
                      }}
                      className="sm:col-span-2 h-10 bg-[#141417] border border-white/15 px-2.5 text-xs text-[#F5F5F3] tabular-nums"
                    />
                    <button
                      type="button"
                      aria-label="Remove fitment"
                      onClick={() => {
                        setCompatibility((p) =>
                          p.filter((_, i) => i !== idx),
                        );
                        markDirty();
                      }}
                      className="col-span-2 sm:col-span-2 h-10 flex items-center justify-center border border-white/10 text-[#A1A1AA] hover:text-[#C81E1E] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>
        </div>

        {/* Right 4 cols: Pricing, Inventory, Status */}
        <div className="lg:col-span-4 space-y-6">
          <AdminPanel title="Pricing (USD)">
            <div className="space-y-4">
              <label className="block space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Price ($) *
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={priceDollars}
                  onChange={(e) => {
                    setPriceDollars(e.target.value);
                    markDirty();
                  }}
                  placeholder="2450.00"
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3.5 text-sm text-[#F5F5F3] tabular-nums focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>

              <label className="block space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Compare-at Price ($) (Optional)
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={compareAtDollars}
                  onChange={(e) => {
                    setCompareAtDollars(e.target.value);
                    markDirty();
                  }}
                  placeholder="2800.00"
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3.5 text-sm text-[#F5F5F3] tabular-nums focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>
            </div>
          </AdminPanel>

          <AdminPanel title="Inventory & Stock">
            <div className="space-y-4">
              <label className="block space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Total Stock Quantity *
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={stock}
                  onChange={(e) => {
                    setStock(e.target.value);
                    markDirty();
                  }}
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3.5 text-sm text-[#F5F5F3] tabular-nums focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>

              <label className="block space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Low-Stock Threshold
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={lowStockThreshold}
                  onChange={(e) => {
                    setLowStockThreshold(e.target.value);
                    markDirty();
                  }}
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3.5 text-sm text-[#F5F5F3] tabular-nums focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>

              {mode === "edit" && initialProduct && (
                <div className="border-t border-white/10 pt-3 space-y-1.5 text-xs text-[#A1A1AA] tabular-nums">
                  <div className="flex justify-between">
                    <span>Reserved by Orders</span>
                    <span className="text-[#F5F5F3]">
                      {initialProduct.reservedStock}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available to Sell</span>
                    <span className="text-[#F5F5F3]">
                      {initialProduct.availableStock}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </AdminPanel>

          <AdminPanel title="Visibility & Status">
            <div className="space-y-4">
              <label className="block space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Catalogue Status
                </span>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(
                      e.target.value as
                        | "draft"
                        | "published"
                        | "out_of_stock"
                        | "archived",
                    );
                    markDirty();
                  }}
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <label className="inline-flex items-center gap-2.5 text-xs text-[#A1A1AA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => {
                    setIsFeatured(e.target.checked);
                    markDirty();
                  }}
                  className="accent-[#C81E1E]"
                />
                Feature product on storefront
              </label>
            </div>
          </AdminPanel>
        </div>
      </div>
    </form>
  );
}
