"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Upload, X } from "lucide-react";
import { AdminPanel } from "@/components/admin/AdminPrimitives";
import { uploadAdminAssetImage } from "@/lib/api/admin-brands.api";
import {
  createAdminCategory,
  getAdminCategories,
  updateAdminCategory,
} from "@/lib/api/admin-categories.api";
import { ApiError } from "@/lib/api/client";
import type { CatalogCategory } from "@/types/catalog.types";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

function toSlug(val: string): string {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface AdminCategoryFormProps {
  mode: "create" | "edit";
  initialCategory?: CatalogCategory;
}

export function AdminCategoryForm({
  mode,
  initialCategory,
}: AdminCategoryFormProps) {
  const router = useRouter();

  const [parentOptions, setParentOptions] = useState<CatalogCategory[]>([]);
  const [name, setName] = useState(initialCategory?.name ?? "");
  const [slug, setSlug] = useState(initialCategory?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [description, setDescription] = useState(
    initialCategory?.description ?? "",
  );
  const [image, setImage] = useState(initialCategory?.image ?? "");
  const [parentId, setParentId] = useState(initialCategory?.parent ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(
    initialCategory?.status ?? "active",
  );

  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAdminCategories({ status: "active" })
      .then((res) => {
        if (!active) return;
        setParentOptions(
          res.data.filter((c) => c._id !== initialCategory?._id),
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [initialCategory?._id]);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Only JPEG, PNG, and WebP images are supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Category image must not exceed 5 MB.");
      return;
    }

    setUploadingImage(true);
    try {
      const uploaded = await uploadAdminAssetImage(file, "gridline/categories");
      setImage(uploaded.url);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to upload category image.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || uploadingImage) return;

    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    const finalSlug = slug.trim() ? toSlug(slug) : toSlug(trimmedName);

    setSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        ...(finalSlug ? { slug: finalSlug } : {}),
        description: description.trim() || undefined,
        image: image.trim() || undefined,
        parent: parentId ? parentId : null,
        status,
      };

      if (mode === "create") {
        await createAdminCategory(payload);
        router.push("/admin/categories");
        router.refresh();
      } else if (initialCategory) {
        const updated = await updateAdminCategory(initialCategory._id, payload);
        setName(updated.name);
        setSlug(updated.slug);
        setDescription(updated.description ?? "");
        setImage(updated.image ?? "");
        setParentId(updated.parent ?? "");
        setStatus(updated.status);
        setSuccess(`Updated category "${updated.name}".`);
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to save category.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/categories"
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3]"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to Categories
        </Link>

        <button
          type="submit"
          disabled={submitting || uploadingImage}
          className="bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium transition-colors cursor-pointer min-h-[44px] disabled:opacity-60"
        >
          {submitting
            ? mode === "create"
              ? "Creating Category..."
              : "Saving..."
            : mode === "create"
              ? "Create Category"
              : "Save Category"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-4 flex items-start gap-2.5 text-xs text-[#F5F5F3]"
        >
          <AlertCircle className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="border border-emerald-500/40 bg-[#0D0D0F] p-4 flex items-center gap-2.5 text-xs text-emerald-400"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <AdminPanel title="Category Details">
            <div className="space-y-4">
              <label className="block space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Category Name *
                </span>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slugEdited) setSlug(toSlug(e.target.value));
                  }}
                  placeholder="Forged Wheels"
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>

              <label className="block space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Slug
                </span>
                <input
                  type="text"
                  maxLength={120}
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="forged-wheels"
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3.5 text-sm text-[#F5F5F3] lowercase focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>

              <label className="block space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Parent Category (Optional)
                </span>
                <select
                  value={parentId ?? ""}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
                >
                  <option value="">None (Top-Level Category)</option>
                  {parentOptions.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Description
                </span>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#141417] border border-white/15 p-3.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>

              <label className="block space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Status
                </span>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "active" | "inactive")
                  }
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
          </AdminPanel>
        </div>

        <div className="lg:col-span-4">
          <AdminPanel
            title="Category Image"
            subtitle="Cloudinary upload or URL"
          >
            <div className="space-y-4">
              {image ? (
                <div className="relative aspect-[4/3] border border-white/15 bg-[#080808] overflow-hidden">
                  <Image
                    src={image}
                    alt={name || "Category image"}
                    fill
                    unoptimized
                    sizes="280px"
                    className="object-contain p-3"
                  />
                  <button
                    type="button"
                    onClick={() => setImage("")}
                    aria-label="Remove category image"
                    className="absolute top-2 right-2 w-7 h-7 bg-[#0D0D0F] border border-white/15 flex items-center justify-center text-[#A1A1AA] hover:text-[#C81E1E] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border border-dashed border-white/20 bg-[#080808] p-6 text-center cursor-pointer hover:border-white/40 transition-colors">
                  <Upload className="w-5 h-5 text-[#A1A1AA] mb-2" />
                  <span className="text-xs text-[#F5F5F3]">
                    {uploadingImage ? "Uploading..." : "Upload Image"}
                  </span>
                  <span className="text-[11px] text-[#71717A] mt-1">
                    JPEG, PNG, WebP (max 5 MB)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingImage}
                    onChange={(e) => void handleImageUpload(e)}
                    className="sr-only"
                  />
                </label>
              )}

              <label className="block space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Image URL
                </span>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-10 bg-[#141417] border border-white/15 px-3 text-xs text-[#F5F5F3] focus:outline-none focus:border-[#F5F5F3]"
                />
              </label>
            </div>
          </AdminPanel>
        </div>
      </div>
    </form>
  );
}
