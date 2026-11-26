"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type PointerEvent,
} from "react";
import Image from "next/image";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import type { CatalogImage } from "@/types/catalog.types";

interface ProductImageLightboxProps {
  images: CatalogImage[];
  activeIndex: number;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  isOptimizedHost: (src: string) => boolean;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.75;

function formatCounter(index: number, total: number): string {
  const cur = String(index + 1).padStart(2, "0");
  const max = String(total).padStart(2, "0");
  return `${cur} / ${max}`;
}

export function ProductImageLightbox({
  images,
  activeIndex,
  productName,
  isOpen,
  onClose,
  onSelectIndex,
  isOptimizedHost,
}: ProductImageLightboxProps) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const dragOriginRef = useRef<{
    pointerX: number;
    pointerY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const total = images.length;
  const safeIndex = total > 0 ? Math.min(Math.max(0, activeIndex), total - 1) : 0;
  const activeImage = images[safeIndex];

  const resetTransform = useCallback(() => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
    dragOriginRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    resetTransform();
    onClose();
  }, [onClose, resetTransform]);

  const handlePrev = useCallback(() => {
    if (total <= 1) return;
    resetTransform();
    onSelectIndex((safeIndex - 1 + total) % total);
  }, [onSelectIndex, resetTransform, safeIndex, total]);

  const handleNext = useCallback(() => {
    if (total <= 1) return;
    resetTransform();
    onSelectIndex((safeIndex + 1) % total);
  }, [onSelectIndex, resetTransform, safeIndex, total]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2)));
      if (next <= MIN_ZOOM) {
        setPan({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  // Lock body scroll and manage focus when open
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        resetTransform();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    handleClose,
    handleNext,
    handlePrev,
    handleZoomIn,
    handleZoomOut,
    isOpen,
    resetTransform,
  ]);

  const clampPan = useCallback(
    (nextX: number, nextY: number, currentZoom: number) => {
      const el = stageRef.current;
      if (!el || currentZoom <= 1) return { x: 0, y: 0 };
      const maxX = ((currentZoom - 1) * el.clientWidth) / 2;
      const maxY = ((currentZoom - 1) * el.clientHeight) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, nextX)),
        y: Math.max(-maxY, Math.min(maxY, nextY)),
      };
    },
    [],
  );

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragOriginRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragOriginRef.current || zoom <= 1) return;
    const dx = e.clientX - dragOriginRef.current.pointerX;
    const dy = e.clientY - dragOriginRef.current.pointerY;
    setPan(
      clampPan(
        dragOriginRef.current.panX + dx,
        dragOriginRef.current.panY + dy,
        zoom,
      ),
    );
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
    dragOriginRef.current = null;
  };

  const handleStageDoubleClick = () => {
    if (zoom > 1) {
      resetTransform();
    } else {
      setZoom(2);
    }
  };

  if (!isOpen || !activeImage) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} fullscreen image viewer`}
      className="fixed inset-0 z-50 bg-[#080808]/95 backdrop-blur-sm flex flex-col select-none"
    >
      {/* Top Studio Control Bar */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-8 py-4 border-b border-[#222228] bg-[#080808]/90">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-[11px] tracking-[0.22em] uppercase text-[#F5F5F3] tabular-nums shrink-0">
            {formatCounter(safeIndex, total)}
          </span>
          <span className="hidden sm:inline text-xs text-[#A1A1AA] truncate">
            {productName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out"
            className="w-10 h-10 flex items-center justify-center border border-[#222228] bg-[#0D0D0F] text-[#F5F5F3] hover:border-[#F5F5F3]/40 disabled:text-[#A1A1AA]/35 disabled:hover:border-[#222228] disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70"
          >
            <ZoomOut className="w-4 h-4" aria-hidden="true" />
          </button>

          <span className="min-w-[48px] text-center text-[11px] tracking-[0.14em] uppercase text-[#A1A1AA] tabular-nums">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className="w-10 h-10 flex items-center justify-center border border-[#222228] bg-[#0D0D0F] text-[#F5F5F3] hover:border-[#F5F5F3]/40 disabled:text-[#A1A1AA]/35 disabled:hover:border-[#222228] disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70"
          >
            <ZoomIn className="w-4 h-4" aria-hidden="true" />
          </button>

          {zoom > MIN_ZOOM && (
            <button
              type="button"
              onClick={resetTransform}
              aria-label="Reset zoom"
              className="w-10 h-10 flex items-center justify-center border border-[#222228] bg-[#0D0D0F] text-[#A1A1AA] hover:text-[#F5F5F3] hover:border-[#F5F5F3]/40 transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </button>
          )}

          <button
            ref={closeBtnRef}
            type="button"
            onClick={handleClose}
            aria-label="Close fullscreen image viewer"
            className="ml-2 w-10 h-10 flex items-center justify-center border border-[#222228] bg-[#141417] text-[#F5F5F3] hover:border-[#C81E1E] hover:bg-[#C81E1E] transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Main Zoom / Pan Stage */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center p-4 sm:p-10">
        {total > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous image"
            className="absolute left-3 sm:left-6 z-10 w-11 h-11 flex items-center justify-center border border-[#222228] bg-[#0D0D0F]/90 text-[#F5F5F3] hover:border-[#F5F5F3]/50 transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        <div
          ref={stageRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleStageDoubleClick}
          className={`relative w-full h-full max-w-[1280px] max-h-[82vh] overflow-hidden ${
            zoom > 1
              ? isDragging
                ? "cursor-grabbing touch-none"
                : "cursor-grab touch-none"
              : "cursor-zoom-in"
          }`}
        >
          <div
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            }}
            className={`relative w-full h-full ${
              isDragging
                ? ""
                : "transition-transform duration-200 ease-out motion-reduce:transition-none"
            }`}
          >
            <Image
              src={activeImage.url}
              alt={activeImage.alt || productName}
              fill
              unoptimized={!isOptimizedHost(activeImage.url)}
              sizes="100vw"
              draggable={false}
              className="object-contain pointer-events-none"
            />
          </div>
        </div>

        {total > 1 && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next image"
            className="absolute right-3 sm:right-6 z-10 w-11 h-11 flex items-center justify-center border border-[#222228] bg-[#0D0D0F]/90 text-[#F5F5F3] hover:border-[#F5F5F3]/50 transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip for multi-image products */}
      {total > 1 && (
        <div className="px-4 sm:px-8 py-3 border-t border-[#222228] bg-[#080808]/90 flex items-center justify-center gap-2.5 overflow-x-auto">
          {images.map((img, idx) => {
            const isActive = idx === safeIndex;
            return (
              <button
                key={`${img.url}-lb-${idx}`}
                type="button"
                onClick={() => {
                  resetTransform();
                  onSelectIndex(idx);
                }}
                aria-label={`Inspect image ${idx + 1} of ${total}`}
                aria-current={isActive ? "true" : undefined}
                className={`relative w-16 h-12 shrink-0 overflow-hidden border bg-[#0D0D0F] cursor-pointer transition-colors focus-visible:outline-1 focus-visible:outline-white/70 ${
                  isActive
                    ? "border-[#C81E1E]"
                    : "border-[#222228] hover:border-[#F5F5F3]/40"
                }`}
              >
                <Image
                  src={img.url}
                  alt={img.alt || `${productName} thumbnail ${idx + 1}`}
                  fill
                  loading="lazy"
                  unoptimized={!isOptimizedHost(img.url)}
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
