"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  return (
    <nav
      aria-label="Catalogue pagination"
      className="pt-10 mt-10 border-t border-white/10 flex items-center justify-between gap-4"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center gap-2 rounded-none border border-white/15 bg-[#0D0D0F] px-4 py-2.5 text-[10px] tracking-[0.22em] uppercase text-zinc-300 hover:border-white/40 hover:text-[#F5F5F3] transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Previous</span>
      </button>

      <div className="flex items-center gap-1.5">
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`h-9 min-w-[36px] px-2.5 rounded-none border text-xs tabular-nums transition-colors cursor-pointer ${
              p === page
                ? "border-[#C81E1E] bg-[#C81E1E]/15 text-[#F5F5F3]"
                : "border-white/10 bg-[#0D0D0F] text-zinc-400 hover:border-white/30 hover:text-[#F5F5F3]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-2 rounded-none border border-white/15 bg-[#0D0D0F] px-4 py-2.5 text-[10px] tracking-[0.22em] uppercase text-zinc-300 hover:border-white/40 hover:text-[#F5F5F3] transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
      >
        <span>Next</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </nav>
  );
}
