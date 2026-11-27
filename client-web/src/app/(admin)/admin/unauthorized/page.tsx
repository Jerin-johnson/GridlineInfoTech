"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut } from "lucide-react";
import { logoutUser } from "@/lib/api/auth.api";
import { useCartStore } from "@/store/cart.store";

export default function AdminUnauthorizedPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logoutUser();
    } catch {
      // Ignore if already logged out
    } finally {
      useCartStore.getState().logoutToGuest();
      router.replace("/login?redirect=%2Fadmin");
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-[#080808] text-[#F5F5F3] flex items-center justify-center p-6">
      <div className="w-full max-w-lg border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-8 sm:p-10 space-y-6">
        <div className="w-11 h-11 border border-white/10 bg-[#141417] flex items-center justify-center text-[#C81E1E]">
          <ShieldAlert className="w-5 h-5" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.26em] uppercase text-[#C81E1E]">
            403 · Access Restricted
          </p>
          <h1 className="font-serif text-3xl font-normal text-[#F5F5F3]">
            Administrator Privileges Required
          </h1>
          <p className="text-sm text-[#A1A1AA] leading-relaxed">
            Your current account does not hold administrator authorization for
            the APEX ATELIER operations console.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-[#F5F5F3] text-[#080808] px-5 py-3 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-white transition-colors min-h-[44px]"
          >
            Return to Storefront
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center justify-center border border-white/15 px-5 py-3 text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-white/40 transition-colors min-h-[44px]"
          >
            Member Profile
          </Link>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-2 border border-white/15 px-4 py-3 text-[11px] tracking-[0.2em] uppercase text-[#A1A1AA] hover:text-[#C81E1E] hover:border-[#C81E1E]/60 transition-colors cursor-pointer min-h-[44px] disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            {signingOut ? "Signing out..." : "Switch Account"}
          </button>
        </div>
      </div>
    </main>
  );
}
