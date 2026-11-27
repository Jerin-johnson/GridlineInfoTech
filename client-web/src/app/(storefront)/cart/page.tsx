import type { Metadata } from "next";
import { CartPageClient } from "@/components/cart/CartPageClient";
import { Navbar } from "@/components/landing/Navbar";
import { ShopFooter } from "@/components/shop/ShopFooter";

export const metadata: Metadata = {
  title: "Your Bag | APEX ATELIER",
  description:
    "Review selected automotive performance hardware before proceeding to checkout.",
};

export default function CartPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F3] flex flex-col">
      <Navbar showNavigateDrawer={false} />
      <div className="flex-1">
        <CartPageClient />
      </div>
      <ShopFooter />
    </div>
  );
}
