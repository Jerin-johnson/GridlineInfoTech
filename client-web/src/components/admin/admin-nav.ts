import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Boxes,
  FolderTree,
  Users,
  Wallet,
  Settings,
} from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
}

export interface AdminNavGroup {
  section: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    section: "OVERVIEW",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        enabled: true,
      },
    ],
  },
  {
    section: "COMMERCE",
    items: [
      {
        label: "Orders",
        href: "/admin/orders",
        icon: ShoppingBag,
        enabled: true,
      },
      {
        label: "Products",
        href: "/admin/products",
        icon: Package,
        enabled: false,
      },
      {
        label: "Inventory",
        href: "/admin/inventory",
        icon: Boxes,
        enabled: false,
      },
      {
        label: "Categories",
        href: "/admin/categories",
        icon: FolderTree,
        enabled: false,
      },
      {
        label: "Customers",
        href: "/admin/customers",
        icon: Users,
        enabled: false,
      },
    ],
  },
  {
    section: "FINANCE",
    items: [
      {
        label: "Payments",
        href: "/admin/payments",
        icon: Wallet,
        enabled: false,
      },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
        enabled: false,
      },
    ],
  },
];
