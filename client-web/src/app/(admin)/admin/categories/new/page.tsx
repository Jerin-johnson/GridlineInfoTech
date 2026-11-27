import { AdminPageHeader } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminCategoryForm } from "@/components/admin/categories/AdminCategoryForm";

export default function AdminNewCategoryPage() {
  return (
    <AdminShell pageTitle="New Category">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="COMMERCE TAXONOMY"
          title="Create Category"
          description="Register a product category and optional parent hierarchy."
        />
        <AdminCategoryForm mode="create" />
      </div>
    </AdminShell>
  );
}
