import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Boxes,
  FolderTree,
  Tag,
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
        enabled: true,
      },
      {
        label: "Inventory",
        href: "/admin/inventory",
        icon: Boxes,
        enabled: true,
      },
      {
        label: "Categories",
        href: "/admin/categories",
        icon: FolderTree,
        enabled: true,
      },
      {
        label: "Brands",
        href: "/admin/brands",
        icon: Tag,
        enabled: true,
      },
      {
        label: "Customers",
        href: "/admin/customers",
        icon: Users,
        enabled: true,
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
        enabled: true,
      },
    ],
  },
  // {
  //   section: "SYSTEM",
  //   items: [
  //     {
  //       label: "Settings",
  //       href: "/admin/settings",
  //       icon: Settings,
  //       enabled: false,
  //     },
  //   ],
  // },
];
