import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminOrderDetailClient } from "@/components/admin/orders/AdminOrderDetailClient";

async function AdminOrderDetailContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ orderId: string }>;
}) {
  const { orderId } = await paramsPromise;
  return <AdminOrderDetailClient orderId={orderId} />;
}

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  return (
    <AdminShell pageTitle="Order Details">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-9 w-48 bg-[#141417]" />
            <div className="h-64 border border-white/10 bg-[#0D0D0F]" />
          </div>
        }
      >
        <AdminOrderDetailContent paramsPromise={params} />
      </Suspense>
    </AdminShell>
  );
}
