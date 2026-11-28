"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/AdminPrimitives";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getCurrentUser } from "@/lib/api/auth.api";
import type { SafeUserProfile } from "@/types/auth.types";

interface AdminShellProps {
  pageTitle: string;
  children: ReactNode;
}

export function AdminShell({ pageTitle, children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname() || "/admin";

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<SafeUserProfile | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const verifyAdminSession = useCallback(async () => {
    setCheckingAuth(true);
    setAuthError(null);
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      if (user.role !== "admin") {
        router.replace("/admin/unauthorized");
        return;
      }
      setAdminUser(user);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : "Unable to verify administrator session.",
      );
    } finally {
      setCheckingAuth(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (!active) return;
        if (!user) {
          router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
        if (user.role !== "admin") {
          router.replace("/admin/unauthorized");
          return;
        }
        setAdminUser(user);
      })
      .catch((err) => {
        if (!active) return;
        setAuthError(
          err instanceof Error
            ? err.message
            : "Unable to verify administrator session.",
        );
      })
      .finally(() => {
        if (active) setCheckingAuth(false);
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (checkingAuth) {
    return <AdminLoadingState />;
  }

  if (authError) {
    return (
      <AdminErrorState
        message={authError}
        onRetry={() => void verifyAdminSession()}
      />
    );
  }

  // Do not flash admin UI while redirect is in flight
  if (!adminUser) {
    return <AdminLoadingState label="Redirecting..." />;
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F3] flex">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <AdminHeader
          user={adminUser}
          pageTitle={pageTitle}
          sidebarCollapsed={sidebarCollapsed}
          onToggleDesktopSidebar={() => setSidebarCollapsed((p) => !p)}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />

        <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
