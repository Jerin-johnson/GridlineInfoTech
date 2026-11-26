"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ShoppingBag,
  Search,
  Wallet,
  ArrowUpRight,
  User,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { getCurrentUser, logoutUser } from "@/lib/api/auth.api";
import type { SafeUserProfile } from "@/types/auth.types";

interface NavItem {
  label: string;
  href: string;
  meta: string;
  description: string;
  previewImage: string;
}

const NAV_LINKS: NavItem[] = [
  {
    label: "Catalogue",
    href: "/shop",
    meta: "Full Inventory",
    description:
      "Browse forged wheels, titanium exhausts, dry-carbon aero, and track braking systems.",
    previewImage:
      "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1000&q=80",
  },
  {
    label: "Categories",
    href: "#categories",
    meta: "05 Departments",
    description:
      "Explore precision-engineered hardware organized by vehicle architecture.",
    previewImage:
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1000&q=80",
  },
  {
    label: "3D Studio",
    href: "#studio-3d",
    meta: "Interactive Inspection",
    description:
      "Inspect forged monoblock tolerances and caliper clearance in real-time 360°.",
    previewImage:
      "https://images.unsplash.com/photo-1611821064430-0d40291d0f0b?auto=format&fit=crop&w=1000&q=80",
  },
  {
    label: "Brands",
    href: "#brands",
    meta: "Authorized Partners",
    description:
      "Direct allocations from Brembo, Akrapovič, BBS Motorsport, Öhlins, and Vorsteiner.",
    previewImage:
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1000&q=80",
  },
  {
    label: "Orders & Tracking",
    href: "/account/orders",
    meta: "Live Fulfillment",
    description:
      "Monitor server-verified crypto payments and real-time shipment milestones.",
    previewImage:
      "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1000&q=80",
  },
  {
    label: "Admin Portal",
    href: "/admin",
    meta: "Operations",
    description:
      "Manage catalogue stock, pricing, fulfillment timelines, and payment audits.",
    previewImage:
      "https://images.unsplash.com/photo-1503736334956-4c8f8e929460?auto=format&fit=crop&w=1000&q=80",
  },
];

interface NavbarProps {
  cartCount?: number;
  walletAddress?: string | null;
  showNavigateDrawer?: boolean;
}

export function Navbar({
  cartCount = 0,
  walletAddress = null,
  showNavigateDrawer = true,
}: NavbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<SafeUserProfile | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // Header background transition on scroll (without progress bar)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 36);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Verify backend session via HttpOnly cookie
  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (active) setCurrentUser(user);
      })
      .catch(() => {
        if (active) setCurrentUser(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Close account dropdown on outside click or Escape
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountMenuOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [accountMenuOpen]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logoutUser();
    } catch {
      // Clear local state even if session already expired
    } finally {
      setCurrentUser(null);
      setAccountMenuOpen(false);
      setMenuOpen(false);
      setIsSigningOut(false);
      router.refresh();
    }
  };

  // Lock body scroll & handle Escape key when drawer is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) setMenuOpen(false);
    };

    if (menuOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  // Build reusable GSAP timeline with reduced-motion support
  useGSAP(
    () => {
      if (!overlayRef.current) return;

      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const tl = gsap.timeline({ paused: true });

      if (prefersReduced) {
        tl.to(overlayRef.current, {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 0.01,
          pointerEvents: "auto",
        });
      } else {
        tl.to(overlayRef.current, {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 0.72,
          ease: "power4.inOut",
          pointerEvents: "auto",
        })
          .fromTo(
            ".nav-mask-text",
            { yPercent: 115, opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              stagger: 0.055,
              duration: 0.65,
              ease: "power3.out",
            },
            "-=0.35",
          )
          .fromTo(
            ".nav-fade-in",
            { y: 18, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              stagger: 0.06,
              duration: 0.5,
              ease: "power2.out",
            },
            "-=0.45",
          );
      }

      tlRef.current = tl;
    },
    { scope: containerRef },
  );

  // Play / reverse timeline cleanly on toggle
  useEffect(() => {
    if (!tlRef.current) return;
    if (menuOpen) {
      tlRef.current.timeScale(1).play();
    } else {
      tlRef.current.timeScale(1.35).reverse();
    }
  }, [menuOpen]);

  const activePreview = NAV_LINKS[hoveredIdx] ?? NAV_LINKS[0];
  const shortWallet = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <div ref={containerRef}>
      {/* Fixed Header */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          isScrolled || menuOpen
            ? "h-16 md:h-[72px] bg-[#080808]/90 backdrop-blur-md border-b border-white/10"
            : "h-20 md:h-24 bg-gradient-to-b from-[#080808]/95 via-[#080808]/50 to-transparent border-b border-transparent"
        }`}
      >
        <div className="h-full max-w-[1600px] mx-auto px-5 sm:px-8 md:px-12 flex items-center justify-between">
          {/* Left: Search + Desktop Wallet Pill */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href="/shop"
              aria-label="Search catalogue"
              className="group flex items-center gap-2.5 text-zinc-400 hover:text-white transition-colors py-2 focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-4"
            >
              <Search className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="hidden md:inline text-[11px] tracking-[0.22em] uppercase">
                Search
              </span>
            </Link>
          </div>

          {/* Center: Brand Emblem */}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            aria-label="APEX ATELIER Home"
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center group focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-4"
          >
            <svg
              width="26"
              height="20"
              viewBox="0 0 28 22"
              fill="none"
              className="text-white transition-transform duration-500 group-hover:scale-110"
            >
              <path
                d="M14 2L26 20H20.5L14 10L7.5 20H2L14 2Z"
                fill="currentColor"
              />
              <path d="M14 14L18 20H10L14 14Z" fill="#C81E1E" />
            </svg>
            <span className="text-[8px] tracking-[0.38em] uppercase text-zinc-400 group-hover:text-white transition-colors mt-1">
              APEX
            </span>
          </Link>

          {/* Right: Account-Aware Auth Controls + Cart + Morphing Navigate Trigger */}
          <div className="flex items-center gap-4 sm:gap-5 md:gap-6">
            {authLoading ? (
              <div
                aria-hidden="true"
                className="hidden sm:block h-7 w-[156px]"
              />
            ) : currentUser ? (
              <div ref={accountMenuRef} className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-2 border border-white/15 bg-[#0D0D0F] px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase text-[#F5F5F3] hover:border-white/40 transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-4"
                >
                  <User className="w-3.5 h-3.5 text-[#C81E1E]" />
                  <span className="max-w-[96px] truncate">
                    {currentUser.firstName}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${
                      accountMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {accountMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 border border-white/15 bg-[#0D0D0F] shadow-none z-50"
                  >
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-xs font-medium text-[#F5F5F3] truncate">
                        {currentUser.firstName} {currentUser.lastName}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {currentUser.email}
                      </p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/shop"
                        role="menuitem"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-4 py-2.5 text-xs text-zinc-300 hover:bg-[#141417] hover:text-[#F5F5F3] transition-colors"
                      >
                        Browse Catalogue
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={isSigningOut}
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2.5 text-xs text-[#C81E1E] hover:bg-[#141417] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>
                          {isSigningOut ? "Signing out..." : "Sign Out"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex py-1.5 text-[11px] tracking-[0.22em] uppercase text-zinc-300 hover:text-white transition-colors focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-4"
                >
                  Login
                </Link>

                <Link
                  href="/register"
                  className="hidden sm:inline-flex items-center border border-white/25 bg-[#F5F5F3]/5 px-3.5 py-1.5 text-[10px] tracking-[0.22em] uppercase text-[#F5F5F3] hover:bg-[#F5F5F3] hover:text-[#080808] hover:border-[#F5F5F3] transition-colors focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-4"
                >
                  Create Account
                </Link>
              </>
            )}

            <Link
              href="/cart"
              aria-label={`Shopping cart with ${cartCount} items`}
              className="relative p-1 text-zinc-300 hover:text-white transition-colors focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-4"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#C81E1E] text-[9px] font-medium flex items-center justify-center text-white tabular-nums">
                  {cartCount}
                </span>
              )}
            </Link>

            {showNavigateDrawer && (
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                aria-controls="fullscreen-nav-drawer"
                aria-label={
                  menuOpen ? "Close navigation menu" : "Open navigation menu"
                }
                className="group flex items-center gap-3 py-2 text-[11px] tracking-[0.24em] uppercase text-zinc-200 hover:text-white transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70 focus-visible:outline-offset-4"
              >
                <span className="hidden sm:inline">
                  {menuOpen ? "Close" : "Navigate"}
                </span>
                {/* Morphing 2-Bar Architectural Icon */}
                <span className="relative w-5 h-3 flex flex-col justify-between">
                  <span
                    className={`block h-[1.5px] w-full bg-current origin-center transition-transform duration-300 ease-out ${
                      menuOpen
                        ? "translate-y-[5px] rotate-45"
                        : "group-hover:w-3.5"
                    }`}
                  />
                  <span
                    className={`block h-[1.5px] w-full bg-current origin-center transition-transform duration-300 ease-out ${
                      menuOpen ? "-translate-y-[5px] -rotate-45" : ""
                    }`}
                  />
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Fullscreen GSAP Navigation Drawer (Landing Page) */}
      {showNavigateDrawer && (
        <div
          id="fullscreen-nav-drawer"
        ref={overlayRef}
        aria-hidden={!menuOpen}
        style={{ clipPath: "inset(0% 0% 100% 0%)" }}
        className="fixed inset-0 z-40 bg-[#080808] bg-noise pointer-events-none overflow-y-auto"
      >
        <div className="min-h-full max-w-[1600px] mx-auto px-6 sm:px-10 md:px-16 pt-24 pb-10 flex flex-col justify-between gap-10">
          {/* Main Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto">
            {/* Left: Editorial Navigation Links */}
            <nav
              aria-label="Primary navigation"
              className="lg:col-span-7 flex flex-col"
            >
              {NAV_LINKS.map((item, idx) => {
                const isActive = hoveredIdx === idx;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onFocus={() => setHoveredIdx(idx)}
                    className="group relative flex items-center justify-between border-b border-white/10 py-4 sm:py-5 transition-colors hover:border-white/30 focus-visible:outline-none focus-visible:border-white"
                  >
                    <div className="flex items-baseline gap-4 sm:gap-7 overflow-hidden">
                      <span
                        className={`nav-mask-text text-[10px] sm:text-[11px] tracking-[0.25em] tabular-nums transition-colors duration-300 ${
                          isActive ? "text-[#C81E1E]" : "text-zinc-500"
                        }`}
                      >
                        0{idx + 1}
                      </span>
                      <span className="overflow-hidden block">
                        <span className="nav-mask-text block font-serif text-3xl sm:text-5xl md:text-6xl font-light tracking-tight text-zinc-300 group-hover:text-white group-hover:translate-x-2 transition-all duration-300">
                          {item.label}
                        </span>
                      </span>
                    </div>

                    <div className="nav-fade-in flex items-center gap-3">
                      <span className="hidden sm:inline text-[10px] tracking-[0.22em] uppercase text-zinc-500 group-hover:text-zinc-300 transition-colors">
                        {item.meta}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Desktop Contextual Studio Preview */}
            <div className="hidden lg:flex lg:col-span-5 flex-col gap-5 nav-fade-in">
              <div className="relative aspect-[4/3] w-full overflow-hidden border border-white/15 bg-[#0D0D0F]">
                {NAV_LINKS.map((item, idx) => (
                  <img
                    key={item.href}
                    src={item.previewImage}
                    alt={item.label}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out ${
                      hoveredIdx === idx
                        ? "opacity-85 scale-100"
                        : "opacity-0 scale-105 pointer-events-none"
                    }`}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent" />
                <span className="absolute bottom-4 left-4 text-[10px] tracking-[0.26em] uppercase text-zinc-300 bg-black/70 border border-white/10 px-3 py-1 backdrop-blur-sm">
                  {activePreview.meta}
                </span>
              </div>

              <p className="text-sm text-zinc-400 leading-relaxed min-h-[44px]">
                {activePreview.description}
              </p>
            </div>
          </div>

          {/* Bottom Utility Bar (Especially helpful on Mobile) */}
          <div className="nav-fade-in pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/checkout"
                onClick={() => setMenuOpen(false)}
                className="inline-flex items-center gap-2 border border-white/15 bg-[#0D0D0F] px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase text-zinc-200 hover:border-white/50 hover:text-white transition-colors"
              >
                <Wallet className="w-3.5 h-3.5 text-[#C81E1E]" />
                <span>{shortWallet ?? "Connect Wallet"}</span>
              </Link>

              {currentUser ? (
                <>
                  <span className="inline-flex items-center gap-2 border border-white/15 bg-[#0D0D0F] px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]">
                    <User className="w-3.5 h-3.5 text-[#C81E1E]" />
                    <span>{currentUser.firstName}</span>
                  </span>
                  <button
                    type="button"
                    disabled={isSigningOut}
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-2 border border-[#C81E1E]/40 bg-[#0D0D0F] px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase text-[#C81E1E] hover:bg-[#C81E1E] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex items-center border border-white/15 bg-[#0D0D0F] px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase text-zinc-200 hover:border-white/50 hover:text-white transition-colors"
                  >
                    Login
                  </Link>

                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex items-center border border-[#F5F5F3] bg-[#F5F5F3] px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase font-medium text-[#080808] hover:bg-white transition-colors"
                  >
                    Create Account
                  </Link>
                </>
              )}
            </div>

            <p className="text-[10px] tracking-[0.24em] uppercase text-zinc-500">
              Precision Automotive Hardware · Verified Crypto Checkout
            </p>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
