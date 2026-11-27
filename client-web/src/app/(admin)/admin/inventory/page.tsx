import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminInventoryClient } from "@/components/admin/inventory/AdminInventoryClient";

export default function AdminInventoryPage() {
  return (
    <AdminShell pageTitle="Inventory">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-10 w-48 bg-[#141417]" />
            <div className="h-64 border border-white/10 bg-[#0D0D0F]" />
          </div>
        }
      >
        <AdminInventoryClient />
      </Suspense>
    </AdminShell>
  );
}
