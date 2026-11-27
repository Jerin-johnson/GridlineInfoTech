import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPaymentsClient } from "@/components/admin/payments/AdminPaymentsClient";

export default function AdminPaymentsPage() {
  return (
    <AdminShell pageTitle="Payments">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-10 w-48 bg-[#141417]" />
            <div className="h-64 border border-white/10 bg-[#0D0D0F]" />
          </div>
        }
      >
        <AdminPaymentsClient />
      </Suspense>
    </AdminShell>
  );
}
