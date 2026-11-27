"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  AdminPanel,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import {
  archiveAdminProduct,
  getAdminProductById,
  updateAdminProduct,
} from "@/lib/api/admin-products.api";
import { formatPriceCents } from "@/lib/api/catalog.api";
import { ApiError } from "@/lib/api/client";
import type { CatalogProduct } from "@/types/catalog.types";

interface AdminProductDetailClientProps {
  productId: string;
}

export function AdminProductDetailClient({
  productId,
}: AdminProductDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<CatalogProduct | null>(null);

  const [stockInput, setStockInput] = useState("");
  const [savingStock, setSavingStock] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setError(null);
    try {
      const data = await getAdminProductById(productId);
      setProduct(data);
      setStockInput(String(data.stock));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace(
          `/login?redirect=${encodeURIComponent(`/admin/products/${productId}`)}`,
        );
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        router.replace("/admin/unauthorized");
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        return;
      }
      setError(
        err instanceof ApiError ? err.message : "Unable to load product.",
      );
    } finally {
      setLoading(false);
    }
  }, [productId, router]);

  useEffect(() => {
    let active = true;
    getAdminProductById(productId)
      .then((data) => {
        if (!active) return;
        setProduct(data);
        setStockInput(String(data.stock));
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace(
            `/login?redirect=${encodeURIComponent(`/admin/products/${productId}`)}`,
          );
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/admin/unauthorized");
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
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

  const handleUpdateStock = async () => {
    if (!product || savingStock) return;
    const parsed = Math.floor(Number(stockInput));
    if (!Number.isInteger(parsed) || parsed < 0) {
      setActionError("Stock quantity must be a non-negative integer.");
      return;
    }

    setSavingStock(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const updated = await updateAdminProduct(product._id, { stock: parsed });
      setProduct(updated);
      setStockInput(String(updated.stock));
      setActionMessage(`Stock updated to ${updated.stock}.`);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to update stock.",
      );
    } finally {
      setSavingStock(false);
    }
  };

  const handleToggleStatus = async (
    nextStatus: "published" | "draft" | "out_of_stock",
  ) => {
    if (!product || savingStock) return;
    setSavingStock(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const updated = await updateAdminProduct(product._id, {
        status: nextStatus,
      });
      setProduct(updated);
      setActionMessage(`Status updated to ${updated.status}.`);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to update status.",
      );
    } finally {
      setSavingStock(false);
    }
  };

  const handleArchive = async () => {
    if (!product || archiving) return;
    setArchiving(true);
    setActionError(null);
    try {
      const archived = await archiveAdminProduct(product._id);
      setProduct(archived);
      setConfirmArchive(false);
      setActionMessage("Product archived. Historical orders remain intact.");
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to archive product.",
      );
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-9 w-56 bg-[#141417]" />
        <div className="h-64 border border-white/10 bg-[#0D0D0F]" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="border border-white/10 bg-[#0D0D0F] p-8 max-w-lg space-y-4">
        <p className="text-[10px] tracking-[0.24em] uppercase text-[#C81E1E]">
          404 · Not Found
        </p>
        <h1 className="font-serif text-2xl text-[#F5F5F3]">
          Product Not Found
        </h1>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 border border-white/15 px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Products
        </Link>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div
        role="alert"
        className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-8 max-w-lg space-y-4"
      >
        <h1 className="font-serif text-2xl text-[#F5F5F3]">
          Unable to Load Product
        </h1>
        <p className="text-sm text-[#A1A1AA]">{error}</p>
        <button
          type="button"
          onClick={() => void loadProduct()}
          className="inline-flex items-center gap-2 bg-[#C81E1E] text-[#F5F5F3] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const catName =
    typeof product.category === "object" && product.category
      ? product.category.name
      : "—";
  const brandName =
    typeof product.brand === "object" && product.brand
      ? product.brand.name
      : "—";

  return (
    <div className="space-y-6">
      <header className="border-b border-white/10 pb-6 space-y-4">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3]"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to Products
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#F5F5F3]">
                {product.name}
              </h1>
              <AdminStatusBadge
                label={product.status.replaceAll("_", " ")}
                tone={
                  product.status === "published"
                    ? "success"
                    : product.status === "out_of_stock"
                      ? "danger"
                      : "neutral"
                }
              />
            </div>
            <p className="text-xs text-[#A1A1AA] tabular-nums">
              SKU: {product.sku} · {brandName} · {catName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/admin/products/${product._id}/edit`}
              className="inline-flex items-center gap-2 bg-[#F5F5F3] text-[#080808] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-white min-h-[44px]"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              Edit Product
            </Link>

            {product.status !== "archived" && !confirmArchive && (
              <button
                type="button"
                onClick={() => setConfirmArchive(true)}
                className="inline-flex items-center gap-2 border border-white/15 px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase text-[#A1A1AA] hover:text-[#C81E1E] hover:border-[#C81E1E]/60 cursor-pointer min-h-[44px]"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Archive
              </button>
            )}
          </div>
        </div>

        {confirmArchive && (
          <div className="border border-white/10 bg-[#0D0D0F] p-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-[#F5F5F3]">
              Archive <strong>{product.name}</strong>? It will be hidden from
              the storefront while preserving historical orders.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={archiving}
                onClick={() => void handleArchive()}
                className="bg-[#C81E1E] text-[#F5F5F3] px-4 py-2 text-[10px] tracking-[0.18em] uppercase cursor-pointer"
              >
                {archiving ? "Archiving..." : "Confirm Archive"}
              </button>
              <button
                type="button"
                disabled={archiving}
                onClick={() => setConfirmArchive(false)}
                className="border border-white/15 px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {actionMessage && (
          <div
            role="status"
            className="border border-emerald-500/40 bg-[#0D0D0F] p-4 flex items-center gap-2 text-xs text-emerald-400"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-4 flex items-start gap-2 text-xs text-[#F5F5F3]"
          >
            <AlertCircle className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <AdminPanel title="Media Gallery">
            {product.images.length === 0 ? (
              <p className="text-xs text-[#71717A]">No images uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {product.images.map((img, idx) => (
                  <div
                    key={`${img.url}-${idx}`}
                    className={`border bg-[#080808] p-2 space-y-1.5 ${
                      img.isPrimary ? "border-[#C81E1E]" : "border-white/10"
                    }`}
                  >
                    <div className="relative aspect-[4/3] bg-[#141417] overflow-hidden">
                      <Image
                        src={img.url}
                        alt={img.alt || product.name}
                        fill
                        unoptimized
                        sizes="200px"
                        className="object-contain p-1"
                      />
                    </div>
                    <p className="text-[10px] tracking-[0.16em] uppercase text-[#A1A1AA]">
                      {img.isPrimary ? "Primary" : `Image ${idx + 1}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          <AdminPanel title="Description & Specifications">
            <div className="space-y-4">
              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                {product.description || "No description provided."}
              </p>
              {product.specifications.length > 0 && (
                <dl className="border-t border-white/10 pt-4 divide-y divide-white/10 text-xs">
                  {product.specifications.map((s, i) => (
                    <div key={i} className="py-2 flex justify-between gap-4">
                      <dt className="text-[#A1A1AA] uppercase tracking-[0.12em]">
                        {s.key}
                      </dt>
                      <dd className="text-[#F5F5F3] text-right tabular-nums">
                        {s.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </AdminPanel>

          <AdminPanel title="Vehicle Fitment">
            {product.compatibility.length === 0 ? (
              <p className="text-xs text-[#71717A]">
                Universal / no chassis fitment specified.
              </p>
            ) : (
              <ul className="divide-y divide-white/10 text-xs">
                {product.compatibility.map((c, i) => (
                  <li key={i} className="py-2.5 flex justify-between gap-4">
                    <span className="text-[#F5F5F3]">
                      {c.make} {c.model}
                    </span>
                    <span className="text-[#A1A1AA] tabular-nums">
                      {c.yearFrom}–{c.yearTo}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <AdminPanel title="Pricing">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#A1A1AA]">Price</dt>
                <dd className="text-[#F5F5F3] font-medium tabular-nums">
                  {formatPriceCents(product.price, product.currency)}
                </dd>
              </div>
              {product.compareAtPrice !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-[#A1A1AA]">Compare-at Price</dt>
                  <dd className="text-[#71717A] line-through tabular-nums">
                    {formatPriceCents(product.compareAtPrice, product.currency)}
                  </dd>
                </div>
              )}
            </dl>
          </AdminPanel>

          <AdminPanel title="Inventory Control">
            <div className="space-y-4">
              <dl className="space-y-2 text-xs tabular-nums">
                <div className="flex justify-between">
                  <dt className="text-[#A1A1AA]">Available to Sell</dt>
                  <dd className="text-[#F5F5F3] font-medium">
                    {product.availableStock}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#A1A1AA]">Reserved by Orders</dt>
                  <dd className="text-[#F5F5F3]">{product.reservedStock}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#A1A1AA]">Low-Stock Threshold</dt>
                  <dd className="text-[#F5F5F3]">{product.lowStockThreshold}</dd>
                </div>
              </dl>

              <div className="border-t border-white/10 pt-4 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  aria-label="Total stock quantity"
                  value={stockInput}
                  onChange={(e) => setStockInput(e.target.value)}
                  className="w-28 h-10 bg-[#141417] border border-white/15 px-3 text-sm text-[#F5F5F3] tabular-nums"
                />
                <button
                  type="button"
                  disabled={savingStock}
                  onClick={() => void handleUpdateStock()}
                  className="flex-1 h-10 bg-[#F5F5F3] text-[#080808] text-[10px] tracking-[0.2em] uppercase font-medium hover:bg-white cursor-pointer disabled:opacity-50"
                >
                  {savingStock ? "Saving..." : "Update Stock"}
                </button>
              </div>

              {product.status !== "archived" && (
                <div className="border-t border-white/10 pt-4 flex flex-wrap gap-2">
                  {(["published", "draft", "out_of_stock"] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={product.status === st || savingStock}
                        onClick={() => void handleToggleStatus(st)}
                        className={`px-3 py-1.5 text-[10px] tracking-[0.16em] uppercase border cursor-pointer disabled:opacity-40 ${
                          product.status === st
                            ? "border-[#C81E1E] text-[#F5F5F3]"
                            : "border-white/15 text-[#A1A1AA] hover:text-[#F5F5F3]"
                        }`}
                      >
                        {st.replaceAll("_", " ")}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
