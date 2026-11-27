import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { Navbar } from "@/components/landing/Navbar";
import { ShopFooter } from "@/components/shop/ShopFooter";

export const metadata: Metadata = {
  title: "Checkout | APEX ATELIER",
  description:
    "Complete your hardware allocation with on-chain crypto settlement or Cash on Delivery.",
};

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F3] flex flex-col">
      <Navbar showNavigateDrawer={false} />
      <div className="flex-1">
        <Suspense
          fallback={
            <main className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 pt-32 pb-20">
              <div className="h-10 w-56 bg-[#141417]" />
            </main>
          }
        >
          <CheckoutClient />
        </Suspense>
      </div>
      <ShopFooter />
    </div>
  );
}
