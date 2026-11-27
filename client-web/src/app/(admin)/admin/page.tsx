import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDashboardClient } from "@/components/admin/dashboard/AdminDashboardClient";

export default function AdminDashboardPage() {
  return (
    <AdminShell pageTitle="Dashboard">
      <AdminDashboardClient />
    </AdminShell>
  );
}
