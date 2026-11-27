"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

interface CartErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function CartErrorState({ message, onRetry }: CartErrorStateProps) {
  return (
    <div
      role="alert"
      className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="w-5 h-5 text-[#C81E1E] shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="text-xs tracking-[0.18em] uppercase text-[#F5F5F3]">
            Synchronization Notice
          </p>
          <p className="text-sm text-[#A1A1AA]">{message}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center gap-2 border border-white/15 bg-[#141417] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-white/40 transition-colors cursor-pointer min-h-[44px] shrink-0 focus-visible:outline-1 focus-visible:outline-white/70"
      >
        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}
