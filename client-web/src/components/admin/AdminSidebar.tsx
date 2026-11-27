"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { ADMIN_NAV_GROUPS } from "@/components/admin/admin-nav";

interface AdminSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() || "/admin";

  return (
    <div className="flex flex-col h-full bg-[#0D0D0F] border-r border-white/10">
      {/* Brand */}
      <div
        className={`h-16 border-b border-white/10 flex items-center shrink-0 ${
          collapsed ? "justify-center px-3" : "px-5 gap-3"
        }`}
      >
        <Link
          href="/admin"
          onClick={onNavigate}
          aria-label="APEX ATELIER Administration"
          className="flex items-center gap-3 min-w-0 focus-visible:outline-1 focus-visible:outline-white/70"
        >
          <svg
            width="22"
            height="18"
            viewBox="0 0 28 22"
            fill="none"
            aria-hidden="true"
            className="text-[#F5F5F3] shrink-0"
          >
            <path
              d="M14 2L26 20H20.5L14 10L7.5 20H2L14 2Z"
              fill="currentColor"
            />
            <path d="M14 14L18 20H10L14 14Z" fill="#C81E1E" />
          </svg>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-[0.26em] uppercase text-[#F5F5F3] truncate">
                APEX ATELIER
              </p>
              <p className="text-[9px] tracking-[0.28em] uppercase text-[#C81E1E] truncate">
                Administration
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Groups */}
      <nav
        aria-label="Admin sidebar navigation"
        className="flex-1 overflow-y-auto py-5 space-y-6"
      >
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.section} className="space-y-1.5">
            {!collapsed && (
              <p className="px-5 text-[9px] tracking-[0.26em] uppercase text-[#71717A]">
                {group.section}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.enabled &&
                  (item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href));

                if (!item.enabled) {
                  return (
                    <li key={item.href}>
                      <span
                        aria-disabled="true"
                        title={`${item.label} (Coming Soon)`}
                        className={`flex items-center justify-between py-2.5 text-xs text-[#71717A]/70 cursor-not-allowed select-none ${
                          collapsed ? "justify-center px-3" : "px-5"
                        }`}
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                          {!collapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </span>
                        {!collapsed && (
                          <span className="text-[9px] tracking-[0.16em] uppercase border border-white/10 px-1.5 py-0.5 text-[#71717A]">
                            Soon
                          </span>
                        )}
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 py-2.5 text-xs transition-colors border-l-2 focus-visible:outline-1 focus-visible:outline-white/70 ${
                        collapsed ? "justify-center px-3" : "px-5"
                      } ${
                        isActive
                          ? "border-l-[#C81E1E] bg-[#141417] text-[#F5F5F3] font-medium"
                          : "border-l-transparent text-[#A1A1AA] hover:bg-[#141417]/60 hover:text-[#F5F5F3]"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function AdminSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  // Close mobile drawer on Escape and lock body scroll while open
  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile();
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-[width] duration-200 motion-reduce:transition-none ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <div className="sticky top-0 h-screen">
          <SidebarContent collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile / Tablet Drawer */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation drawer"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/75"
            aria-hidden="true"
          />
          <div className="relative z-10 w-64 max-w-[82vw] h-full">
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation drawer"
              className="absolute top-3.5 right-3 z-20 w-9 h-9 flex items-center justify-center border border-white/10 bg-[#141417] text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
            <SidebarContent collapsed={false} onNavigate={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  );
}
