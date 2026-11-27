import { AdminPageHeader } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminBrandForm } from "@/components/admin/brands/AdminBrandForm";

export default function AdminNewBrandPage() {
  return (
    <AdminShell pageTitle="New Brand">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="COMMERCE TAXONOMY"
          title="Create Brand"
          description="Register an authorized performance hardware brand."
        />
        <AdminBrandForm mode="create" />
      </div>
    </AdminShell>
  );
}
