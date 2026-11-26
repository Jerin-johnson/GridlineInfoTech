"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, RotateCcw } from "lucide-react";

export function ProductErrorState() {
  const router = useRouter();

  return (
    <main className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 pt-32 pb-24">
      <div className="max-w-lg mx-auto border border-[#222228] bg-[#0D0D0F] p-8 sm:p-10 text-center space-y-5">
        <div className="w-10 h-10 mx-auto border border-[#222228] flex items-center justify-center text-[#C81E1E]">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.24em] uppercase text-[#A1A1AA]">
            Connection Interrupted
          </p>
          <h1 className="font-serif text-2xl font-normal text-[#F5F5F3]">
            Unable to Load Hardware Specification
          </h1>
          <p className="text-sm text-[#A1A1AA]">
            We could not retrieve this product from the APEX ATELIER catalogue
            service. Please try again.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-2 bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-5 py-3 text-[11px] tracking-[0.2em] uppercase font-medium transition-colors cursor-pointer min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
          <Link
            href="/shop"
            className="inline-flex items-center border border-[#222228] px-5 py-3 text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-[#F5F5F3]/40 transition-colors min-h-[44px]"
          >
            Back to Catalogue
          </Link>
        </div>
      </div>
    </main>
  );
}
