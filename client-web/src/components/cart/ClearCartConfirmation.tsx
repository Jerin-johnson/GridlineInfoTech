"use client";

import { useState } from "react";

interface ClearCartConfirmationProps {
  isClearing: boolean;
  onConfirmClear: () => Promise<void>;
}

export function ClearCartConfirmation({
  isClearing,
  onConfirmClear,
}: ClearCartConfirmationProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={isClearing}
        className="text-[11px] tracking-[0.2em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] transition-colors cursor-pointer min-h-[44px] px-2 focus-visible:outline-1 focus-visible:outline-white/70"
      >
        Clear Bag
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Confirm clearing bag"
      className="flex flex-wrap items-center gap-2 border border-white/10 bg-[#0D0D0F] px-3 py-1.5"
    >
      <span className="text-[11px] text-[#A1A1AA] mr-1">
        Remove all items?
      </span>
      <button
        type="button"
        onClick={async () => {
          await onConfirmClear();
          setConfirming(false);
        }}
        disabled={isClearing}
        className="bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase font-medium transition-colors cursor-pointer min-h-[36px] disabled:opacity-60"
      >
        {isClearing ? "Clearing..." : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={isClearing}
        className="border border-white/15 bg-[#141417] text-[#A1A1AA] hover:text-[#F5F5F3] px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase transition-colors cursor-pointer min-h-[36px]"
      >
        Cancel
      </button>
    </div>
  );
}
