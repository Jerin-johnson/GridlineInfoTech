import { Navbar } from "@/components/landing/Navbar";
import { ProductDetailSkeleton } from "@/components/product/ProductDetailSkeleton";

export default function ProductLoadingPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F3]">
      <Navbar showNavigateDrawer={false} />
      <ProductDetailSkeleton />
    </div>
  );
}
