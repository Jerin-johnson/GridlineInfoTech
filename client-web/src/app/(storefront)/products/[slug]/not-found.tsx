import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { ShopFooter } from "@/components/shop/ShopFooter";

export default function ProductNotFoundPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F3] flex flex-col">
      <Navbar showNavigateDrawer={false} />
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-5 sm:px-8 md:px-12 pt-36 pb-24 flex items-center justify-center">
        <div className="max-w-lg w-full border border-[#222228] bg-[#0D0D0F] p-8 sm:p-10 text-center space-y-5">
          <p className="text-[10px] tracking-[0.26em] uppercase text-[#C81E1E]">
            404 · Hardware Not Found
          </p>
          <h1 className="font-serif text-3xl font-normal text-[#F5F5F3]">
            Component Unavailable
          </h1>
          <p className="text-sm text-[#A1A1AA] leading-relaxed">
            The requested part number or slug is no longer listed in our active
            catalogue.
          </p>
          <div className="pt-2">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center bg-[#F5F5F3] text-[#080808] px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium hover:bg-white transition-colors min-h-[44px]"
            >
              Browse Catalogue
            </Link>
          </div>
        </div>
      </main>
      <ShopFooter />
    </div>
  );
}
