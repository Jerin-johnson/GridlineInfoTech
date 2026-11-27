"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, RotateCcw } from "lucide-react";
import { AddressSelector } from "@/components/checkout/AddressSelector";
import { Navbar } from "@/components/landing/Navbar";
import { OrderHistorySection } from "@/components/orders/OrderHistorySection";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { getAddresses } from "@/lib/api/addresses.api";
import { getCurrentUser } from "@/lib/api/auth.api";
import { ApiError } from "@/lib/api/client";
import type { UserAddress } from "@/types/address.types";
import type { SafeUserProfile } from "@/types/auth.types";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [user, setUser] = useState<SafeUserProfile | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const profile = await getCurrentUser();
      if (!profile) {
        router.replace("/login?redirect=%2Fprofile");
        return;
      }
      setUser(profile);
      const addrs = await getAddresses().catch(() => []);
      setAddresses(addrs);
      setSelectedAddressId(
        (addrs.find((a) => a.isDefault) ?? addrs[0])?._id ?? null,
      );
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "Unable to load your profile right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(async (profile) => {
        if (!active) return;
        if (!profile) {
          router.replace("/login?redirect=%2Fprofile");
          return;
        }
        setUser(profile);
        const addrs = await getAddresses().catch(() => []);
        if (!active) return;
        setAddresses(addrs);
        setSelectedAddressId(
          (addrs.find((a) => a.isDefault) ?? addrs[0])?._id ?? null,
        );
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "Unable to load your profile right now. Please try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F3] flex flex-col">
      <Navbar showNavigateDrawer={false} />
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-5 sm:px-8 md:px-12 pt-32 pb-20 space-y-10">
        {loading ? (
          <div className="space-y-6">
            <div className="h-10 w-56 bg-[#141417]" />
            <div className="h-48 border border-white/10 bg-[#0D0D0F]" />
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-8 space-y-4 max-w-xl"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className="w-5 h-5 text-[#C81E1E] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <h1 className="font-serif text-2xl text-[#F5F5F3]">
                  Profile Unavailable
                </h1>
                <p className="text-sm text-[#A1A1AA]">{loadError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadProfileData()}
              className="inline-flex items-center gap-2 bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase cursor-pointer min-h-[44px]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : user ? (
          <>
            <header className="border-b border-white/10 pb-6 flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-[10px] tracking-[0.26em] uppercase text-[#A1A1AA]">
                  Member Profile
                </p>
                <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#F5F5F3]">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-sm text-[#A1A1AA]">{user.email}</p>
              </div>
              <Link
                href="/shop"
                className="border border-white/15 px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-white/40 transition-colors min-h-[44px] inline-flex items-center"
              >
                Browse Catalogue
              </Link>
            </header>

            <AddressSelector
              addresses={addresses}
              selectedAddressId={selectedAddressId}
              onSelectAddress={setSelectedAddressId}
              onAddressesChange={setAddresses}
            />

            <div id="orders">
              <OrderHistorySection />
            </div>
          </>
        ) : null}
      </main>
      <ShopFooter />
    </div>
  );
}
