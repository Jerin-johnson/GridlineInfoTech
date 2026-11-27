"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Administration",
  orders: "Orders",
  products: "Products",
  inventory: "Inventory",
  categories: "Categories",
  brands: "Brands",
  customers: "Customers",
  payments: "Payments",
  settings: "Settings",
  unauthorized: "Unauthorized",
  new: "New",
  edit: "Edit",
};

export function AdminBreadcrumbs() {
  const pathname = usePathname() || "/admin";
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((seg, idx) => {
    const href = `/${segments.slice(0, idx + 1).join("/")}`;
    const isMongoId = /^[a-f0-9]{24}$/i.test(seg);
    const prev = segments[idx - 1];
    let label =
      SEGMENT_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
    if (isMongoId) {
      if (prev === "orders") label = `Order #${seg.slice(-6).toUpperCase()}`;
      else if (prev === "products")
        label = `Product #${seg.slice(-6).toUpperCase()}`;
      else if (prev === "brands")
        label = `Brand #${seg.slice(-6).toUpperCase()}`;
      else if (prev === "categories")
        label = `Category #${seg.slice(-6).toUpperCase()}`;
      else if (prev === "customers")
        label = `Customer #${seg.slice(-6).toUpperCase()}`;
    } else if (seg === "new") {
      if (prev === "brands") label = "New Brand";
      else if (prev === "categories") label = "New Category";
      else if (prev === "products") label = "New Product";
    }
    return { href, label, isLast: idx === segments.length - 1 };
  });

  if (crumbs.length === 1) {
    crumbs.push({ href: "/admin", label: "Dashboard", isLast: true });
  }

  return (
    <nav aria-label="Admin breadcrumb" className="hidden sm:flex items-center">
      <ol className="flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase">
        {crumbs.map((crumb, idx) => (
          <li key={`${crumb.href}-${idx}`} className="flex items-center gap-1.5">
            {idx > 0 && (
              <ChevronRight
                className="w-3 h-3 text-[#71717A]"
                aria-hidden="true"
              />
            )}
            {crumb.isLast ? (
              <span aria-current="page" className="text-[#F5F5F3]">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-[#A1A1AA] hover:text-[#F5F5F3] transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
