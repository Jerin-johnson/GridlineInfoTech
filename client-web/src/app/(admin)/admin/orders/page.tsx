import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminOrdersClient } from "@/components/admin/orders/AdminOrdersClient";

export default function AdminOrdersPage() {
  return (
    <AdminShell pageTitle="Orders">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-10 w-48 bg-[#141417]" />
            <div className="h-64 border border-white/10 bg-[#0D0D0F]" />
          </div>
        }
      >
        <AdminOrdersClient />
      </Suspense>
    </AdminShell>
  );
}
