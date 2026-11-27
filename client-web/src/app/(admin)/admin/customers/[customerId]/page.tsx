import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminCustomerDetailClient } from "@/components/admin/customers/AdminCustomerDetailClient";

export default function AdminCustomerDetailPage() {
  return (
    <AdminShell pageTitle="Customer Profile">
      <Suspense fallback={<div className="h-64 bg-[#0D0D0F]" />}>
        <AdminCustomerDetailClient />
      </Suspense>
    </AdminShell>
  );
}
