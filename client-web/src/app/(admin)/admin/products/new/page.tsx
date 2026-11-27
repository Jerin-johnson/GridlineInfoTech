import { AdminPageHeader } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProductForm } from "@/components/admin/products/AdminProductForm";

export default function AdminNewProductPage() {
  return (
    <AdminShell pageTitle="New Product">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="COMMERCE CATALOGUE"
          title="Create Product"
          description="Add precision automotive hardware with specifications, fitment, and Cloudinary imagery."
        />
        <AdminProductForm mode="create" />
      </div>
    </AdminShell>
  );
}
