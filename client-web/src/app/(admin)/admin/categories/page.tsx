import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminCategoriesClient } from "@/components/admin/categories/AdminCategoriesClient";

export default function AdminCategoriesPage() {
  return (
    <AdminShell pageTitle="Categories">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-10 w-48 bg-[#141417]" />
            <div className="h-64 border border-white/10 bg-[#0D0D0F]" />
          </div>
        }
      >
        <AdminCategoriesClient />
      </Suspense>
    </AdminShell>
  );
}
