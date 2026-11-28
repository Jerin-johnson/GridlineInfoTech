"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  User,
} from "lucide-react";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { logoutUser } from "@/lib/api/auth.api";
import { useCartStore } from "@/store/cart.store";
import type { SafeUserProfile } from "@/types/auth.types";

interface AdminHeaderProps {
  user: SafeUserProfile;
  pageTitle: string;
  sidebarCollapsed: boolean;
  onToggleDesktopSidebar: () => void;
  onOpenMobileSidebar: () => void;
}

export function AdminHeader({
  user,
  pageTitle,
  sidebarCollapsed,
  onToggleDesktopSidebar,
  onOpenMobileSidebar,
}: AdminHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logoutUser();
    } catch {
      // Proceed with local cleanup even if session already expired
    } finally {
      useCartStore.getState().logoutToGuest();
      setMenuOpen(false);
      setSigningOut(false);
      router.replace("/admin/login");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-white/10 bg-[#080808]/95 backdrop-blur-sm px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open admin navigation"
          className="lg:hidden w-10 h-10 flex items-center justify-center border border-white/10 bg-[#0D0D0F] text-[#F5F5F3] hover:border-white/30 cursor-pointer shrink-0"
        >
          <Menu className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Desktop Sidebar Collapse Toggle */}
        <button
          type="button"
          onClick={onToggleDesktopSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex w-9 h-9 items-center justify-center border border-white/10 bg-[#0D0D0F] text-[#A1A1AA] hover:text-[#F5F5F3] hover:border-white/30 cursor-pointer shrink-0"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        <div className="min-w-0 space-y-0.5">
          <AdminBreadcrumbs />
          <p className="sm:hidden text-xs tracking-[0.18em] uppercase text-[#F5F5F3] truncate">
            {pageTitle}
          </p>
        </div>
      </div>

      {/* Admin Account Dropdown */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="inline-flex items-center gap-2.5 border border-white/15 bg-[#0D0D0F] px-3 py-2 text-[11px] tracking-[0.16em] uppercase text-[#F5F5F3] hover:border-white/35 transition-colors cursor-pointer min-h-[40px]"
        >
          <User className="w-3.5 h-3.5 text-[#C81E1E]" aria-hidden="true" />
          <span className="max-w-[120px] truncate">{user.firstName}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#A1A1AA] transition-transform duration-200 ${
              menuOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-60 border border-white/15 bg-[#0D0D0F] z-50"
          >
            <div className="px-4 py-3 border-b border-white/10 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[#F5F5F3] truncate">
                  {user.firstName} {user.lastName}
                </p>
                <span className="text-[9px] tracking-[0.18em] uppercase border border-[#C81E1E]/60 text-[#C81E1E] px-1.5 py-0.5 shrink-0">
                  {user.role}
                </span>
              </div>
              <p className="text-[11px] text-[#A1A1AA] truncate">
                {user.email}
              </p>
            </div>
            <div className="py-1">
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-xs text-[#A1A1AA] hover:bg-[#141417] hover:text-[#F5F5F3] transition-colors"
              >
                Profile
              </Link>
              <Link
                href="/"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-xs text-[#A1A1AA] hover:bg-[#141417] hover:text-[#F5F5F3] transition-colors"
              >
                Storefront
              </Link>
              <button
                type="button"
                role="menuitem"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
                className="w-full text-left px-4 py-2.5 text-xs text-[#C81E1E] hover:bg-[#141417] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
