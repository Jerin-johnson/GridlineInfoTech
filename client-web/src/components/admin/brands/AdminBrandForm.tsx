"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Upload, X } from "lucide-react";
import { AdminPanel } from "@/components/admin/AdminPrimitives";
import {
  createAdminBrand,
  updateAdminBrand,
  uploadAdminAssetImage,
} from "@/lib/api/admin-brands.api";
import { ApiError } from "@/lib/api/client";
import type { CatalogBrand } from "@/types/catalog.types";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

function toSlug(val: string): string {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface AdminBrandFormProps {
  mode: "create" | "edit";
  initialBrand?: CatalogBrand;
}

export function AdminBrandForm({ mode, initialBrand }: AdminBrandFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialBrand?.name ?? "");
  const [slug, setSlug] = useState(initialBrand?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [description, setDescription] = useState(
    initialBrand?.description ?? "",
  );
  const [logo, setLogo] = useState(initialBrand?.logo ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(
    initialBrand?.status ?? "active",
  );

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Only JPEG, PNG, and WebP images are supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Logo image must not exceed 5 MB.");
      return;
    }

    setUploadingLogo(true);
    try {
      const uploaded = await uploadAdminAssetImage(file, "gridline/brands");
      setLogo(uploaded.url);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to upload brand logo.",
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || uploadingLogo) return;

    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Brand name is required.");
      return;
    }

    const finalSlug = slug.trim() ? toSlug(slug) : toSlug(trimmedName);

    setSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        ...(finalSlug ? { slug: finalSlug } : {}),
        description: description.trim() || undefined,
        logo: logo.trim() || undefined,
        status,
      };

      if (mode === "create") {
        await createAdminBrand(payload);
        router.push("/admin/brands");
        router.refresh();
      } else if (initialBrand) {
        const updated = await updateAdminBrand(initialBrand._id, payload);
        setName(updated.name);
        setSlug(updated.slug);
        setDescription(updated.description ?? "");
        setLogo(updated.logo ?? "");
        setStatus(updated.status);
        setSuccess(`Updated brand "${updated.name}".`);
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to save brand.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/brands"
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3]"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to Brands
        </Link>

        <button
          type="submit"
          disabled={submitting || uploadingLogo}
          className="bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium transition-colors cursor-pointer min-h-[44px] disabled:opacity-60"
        >
          {submitting
            ? mode === "create"
              ? "Creating Brand..."
              : "Saving..."
            : mode === "create"
              ? "Create Brand"
              : "Save Brand"}
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
          <AdminPanel title="Brand Details">
            <div className="space-y-4">
              <label className="block space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Brand Name *
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
                  placeholder="BBS Motorsport"
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
                  placeholder="bbs-motorsport"
                  className="w-full h-11 bg-[#141417] border border-white/15 px-3.5 text-sm text-[#F5F5F3] lowercase focus:outline-none focus:border-[#F5F5F3]"
                />
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
          <AdminPanel title="Brand Logo" subtitle="Cloudinary upload or URL">
            <div className="space-y-4">
              {logo ? (
                <div className="relative aspect-[4/3] border border-white/15 bg-[#080808] overflow-hidden">
                  <Image
                    src={logo}
                    alt={name || "Brand logo"}
                    fill
                    unoptimized
                    sizes="280px"
                    className="object-contain p-3"
                  />
                  <button
                    type="button"
                    onClick={() => setLogo("")}
                    aria-label="Remove logo"
                    className="absolute top-2 right-2 w-7 h-7 bg-[#0D0D0F] border border-white/15 flex items-center justify-center text-[#A1A1AA] hover:text-[#C81E1E] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border border-dashed border-white/20 bg-[#080808] p-6 text-center cursor-pointer hover:border-white/40 transition-colors">
                  <Upload className="w-5 h-5 text-[#A1A1AA] mb-2" />
                  <span className="text-xs text-[#F5F5F3]">
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  </span>
                  <span className="text-[11px] text-[#71717A] mt-1">
                    JPEG, PNG, WebP (max 5 MB)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingLogo}
                    onChange={(e) => void handleLogoUpload(e)}
                    className="sr-only"
                  />
                </label>
              )}

              <label className="block space-y-1.5 text-xs">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] block">
                  Logo URL
                </span>
                <input
                  type="url"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
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
