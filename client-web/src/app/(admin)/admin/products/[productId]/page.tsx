import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProductDetailClient } from "@/components/admin/products/AdminProductDetailClient";

async function AdminProductDetailContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ productId: string }>;
}) {
  const { productId } = await paramsPromise;
  return <AdminProductDetailClient productId={productId} />;
}

export default function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  return (
    <AdminShell pageTitle="Product Details">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-9 w-48 bg-[#141417]" />
            <div className="h-64 border border-white/10 bg-[#0D0D0F]" />
          </div>
        }
      >
        <AdminProductDetailContent paramsPromise={params} />
      </Suspense>
    </AdminShell>
  );
}
