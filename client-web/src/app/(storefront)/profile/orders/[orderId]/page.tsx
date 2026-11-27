import { Suspense } from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { OrderDetailClient } from "@/components/orders/OrderDetailClient";
import { ShopFooter } from "@/components/shop/ShopFooter";

export const metadata: Metadata = {
  title: "Order Details | APEX ATELIER",
  description:
    "Track fulfilment progress, manage payment, and review order specifications.",
};

async function OrderDetailContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ orderId: string }>;
}) {
  const { orderId } = await paramsPromise;
  return <OrderDetailClient orderId={orderId} />;
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F3] flex flex-col">
      <Navbar showNavigateDrawer={false} />
      <div className="flex-1">
        <Suspense
          fallback={
            <main className="max-w-[1200px] mx-auto px-5 sm:px-8 md:px-12 pt-32 pb-20">
              <div className="h-10 w-56 bg-[#141417]" />
            </main>
          }
        >
          <OrderDetailContent paramsPromise={params} />
        </Suspense>
      </div>
      <ShopFooter />
    </div>
  );
}
