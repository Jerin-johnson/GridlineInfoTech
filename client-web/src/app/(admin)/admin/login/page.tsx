import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Sign In | APEX ATELIER",
  description: "Sign in to the APEX ATELIER operations console.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080808] flex items-center justify-center text-xs tracking-[0.2em] uppercase text-[#A1A1AA]">
          Loading console...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
