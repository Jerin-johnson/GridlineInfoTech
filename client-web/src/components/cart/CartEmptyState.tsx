import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export function CartEmptyState() {
  return (
    <div className="border border-white/10 bg-[#0D0D0F] p-10 sm:p-16 text-center max-w-2xl mx-auto space-y-6">
      <div className="w-12 h-12 mx-auto border border-white/10 bg-[#141417] flex items-center justify-center text-[#A1A1AA]">
        <ShoppingBag className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <p className="text-[10px] tracking-[0.26em] uppercase text-[#A1A1AA]">
          Allocation Bag
        </p>
        <h2 className="font-serif text-3xl font-normal text-[#F5F5F3]">
          Your Bag Is Empty
        </h2>
        <p className="text-sm text-[#A1A1AA] max-w-md mx-auto leading-relaxed">
          Explore forged wheels, titanium exhaust systems, carbon-ceramic brakes,
          and dry-carbon aero components in our catalogue.
        </p>
      </div>
      <div className="pt-2">
        <Link
          href="/shop"
          className="inline-flex items-center justify-center bg-[#F5F5F3] text-[#080808] px-7 py-3.5 text-[11px] tracking-[0.22em] uppercase font-medium hover:bg-white transition-colors min-h-[44px]"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
