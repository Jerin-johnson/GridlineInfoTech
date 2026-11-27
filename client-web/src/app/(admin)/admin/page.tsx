import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminDashboardPage() {
  return (
    <AdminShell pageTitle="Dashboard">
      <div className="space-y-8">
        <AdminPageHeader
          eyebrow="ADMINISTRATION"
          title="Dashboard"
          description="Store performance and operational overview."
          actions={<AdminStatusBadge label="Foundation Active" tone="success" />}
        />

        {/* KPI Placeholders (awaiting dedicated analytics endpoints) */}
        <section
          aria-label="Key performance indicators"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          <AdminStatCard
            label="Total Revenue"
            value={null}
            hint="Awaiting finance feed"
          />
          <AdminStatCard
            label="Orders"
            value={null}
            hint="Awaiting orders module"
          />
          <AdminStatCard
            label="Pending Orders"
            value={null}
            hint="Awaiting orders module"
          />
          <AdminStatCard
            label="Products"
            value={null}
            hint="Awaiting catalogue module"
          />
          <AdminStatCard
            label="Low Stock"
            value={null}
            hint="Awaiting inventory module"
          />
        </section>

        {/* Dashboard Structural Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <AdminPanel
              title="Recent Orders"
              subtitle="Live order queue & payment status"
              actions={<AdminStatusBadge label="Module Pending" />}
            >
              <AdminEmptyState
                title="Orders Module Not Connected"
                description="Administrative order listing, fulfilment transitions, and shipment tracking will populate here in the Admin Orders phase."
              />
            </AdminPanel>

            <AdminPanel
              title="Sales Overview"
              subtitle="Verified settlement volume"
              actions={<AdminStatusBadge label="Module Pending" />}
            >
              <AdminEmptyState
                title="Analytics Feed Unavailable"
                description="Revenue breakdowns and crypto/COD settlement curves will render once the backend reporting endpoint is introduced."
              />
            </AdminPanel>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <AdminPanel
              title="Top Products"
              subtitle="High-demand forged & aero hardware"
              actions={<AdminStatusBadge label="Module Pending" />}
            >
              <AdminEmptyState
                title="Product Performance Pending"
                description="Top-performing SKUs and category velocity will appear here when the Admin Products module is connected."
              />
            </AdminPanel>

            <AdminPanel
              title="Inventory Alerts"
              subtitle="Low-stock & reserved thresholds"
              actions={<AdminStatusBadge label="Module Pending" />}
            >
              <AdminEmptyState
                title="No Active Feed"
                description="Real-time low-stock and reservation alerts will surface here once the Admin Inventory module is implemented."
              />
            </AdminPanel>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
