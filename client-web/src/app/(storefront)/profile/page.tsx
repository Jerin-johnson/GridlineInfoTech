"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddressSelector } from "@/components/checkout/AddressSelector";
import { Navbar } from "@/components/landing/Navbar";
import { OrderHistorySection } from "@/components/orders/OrderHistorySection";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { getAddresses } from "@/lib/api/addresses.api";
import { getCurrentUser } from "@/lib/api/auth.api";
import type { UserAddress } from "@/types/address.types";
import type { SafeUserProfile } from "@/types/auth.types";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SafeUserProfile | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );

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

            <OrderHistorySection />
          </>
        ) : null}
      </main>
      <ShopFooter />
    </div>
  );
}
