import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProductsClient } from "@/components/admin/products/AdminProductsClient";

export default function AdminProductsPage() {
  return (
    <AdminShell pageTitle="Products">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-10 w-48 bg-[#141417]" />
            <div className="h-64 border border-white/10 bg-[#0D0D0F]" />
          </div>
        }
      >
        <AdminProductsClient />
      </Suspense>
    </AdminShell>
  );
}
