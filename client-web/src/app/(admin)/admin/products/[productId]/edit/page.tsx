import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProductEditClient } from "@/components/admin/products/AdminProductEditClient";

async function AdminProductEditContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ productId: string }>;
}) {
  const { productId } = await paramsPromise;
  return <AdminProductEditClient productId={productId} />;
}

export default function AdminProductEditPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  return (
    <AdminShell pageTitle="Edit Product">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-9 w-48 bg-[#141417]" />
            <div className="h-64 border border-white/10 bg-[#0D0D0F]" />
          </div>
        }
      >
        <AdminProductEditContent paramsPromise={params} />
      </Suspense>
    </AdminShell>
  );
}
