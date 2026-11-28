"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { AuthField } from "@/components/auth/AuthField";
import {
  getCurrentUser,
  getSafeRedirectPath,
  loginUser,
  logoutUser,
} from "@/lib/api/auth.api";
import { ApiError } from "@/lib/api/client";
import { useCartStore } from "@/store/cart.store";
import type { SafeUserProfile } from "@/types/auth.types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveAdminRedirect(rawRedirect: string | null): string {
  const safe = getSafeRedirectPath(rawRedirect);
  if (!safe.startsWith("/admin") || safe.startsWith("/admin/login")) {
    return "/admin";
  }
  return safe;
}

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = resolveAdminRedirect(searchParams.get("redirect"));

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [nonAdminUser, setNonAdminUser] = useState<SafeUserProfile | null>(
    null,
  );
  const [signingOut, setSigningOut] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (!active) return;
        if (user?.role === "admin") {
          router.replace(redirectTarget);
          return;
        }
        if (user) {
          setNonAdminUser(user);
        }
      })
      .catch(() => {
        // Ignore transient session check errors on initial mount
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [router, redirectTarget]);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = "Please enter your administrator email address.";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Please enter your password.";
    }

    setFieldErrors(errors);

    if (errors.email) {
      emailInputRef.current?.focus();
    } else if (errors.password) {
      passwordInputRef.current?.focus();
    }

    return Object.keys(errors).length === 0;
  };

  const handleSwitchAccount = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setServerError(null);
    try {
      await logoutUser();
    } catch {
      // Proceed even if session already expired
    } finally {
      useCartStore.getState().logoutToGuest();
      setNonAdminUser(null);
      setSigningOut(false);
      setTimeout(() => emailInputRef.current?.focus(), 0);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.user.role !== "admin") {
        try {
          await logoutUser();
        } catch {
          // Best-effort cleanup of non-admin session on admin login
        }
        useCartStore.getState().logoutToGuest();
        setNonAdminUser(null);
        setServerError(
          "Access denied: this account does not have administrator privileges.",
        );
        return;
      }

      setIsSuccess(true);
      router.replace(redirectTarget);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          err.status === 401
            ? "Invalid administrator email or password."
            : err.message,
        );
      } else {
        setServerError("Unable to sign in right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080808] text-[#F5F5F3] flex flex-col justify-between p-6 sm:p-10">
      {/* Top Bar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="APEX ATELIER Home"
          className="inline-flex items-center gap-2.5 text-[#F5F5F3] focus-visible:outline-2 focus-visible:outline-[#F5F5F3] focus-visible:outline-offset-4"
        >
          <svg
            width="24"
            height="18"
            viewBox="0 0 28 22"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M14 2L26 20H20.5L14 10L7.5 20H2L14 2Z"
              fill="currentColor"
            />
            <path d="M14 14L18 20H10L14 14Z" fill="#C81E1E" />
          </svg>
          <span className="text-xs font-medium tracking-[0.24em] uppercase">
            APEX ATELIER
          </span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs tracking-[0.16em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Storefront</span>
        </Link>
      </header>

      {/* Center Card */}
      <div className="w-full max-w-md mx-auto my-10 border border-white/10 border-t-2 border-t-[#C81E1E] bg-[#0D0D0F] p-7 sm:p-10 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.26em] uppercase text-[#C81E1E]">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Operations Console</span>
          </div>
          <h1 className="font-serif text-3xl font-light leading-tight text-[#F5F5F3]">
            Administrator Sign In
          </h1>
          <p className="text-sm text-[#A1A1AA] leading-relaxed">
            Restricted access for APEX ATELIER catalog, order, and payment
            operations.
          </p>
        </div>

        {checkingSession ? (
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-xs tracking-[0.18em] uppercase text-[#A1A1AA]">
            <Loader2
              className="w-5 h-5 animate-spin text-[#C81E1E]"
              aria-hidden="true"
            />
            <span>Verifying session...</span>
          </div>
        ) : nonAdminUser ? (
          <div className="space-y-5">
            <div
              role="alert"
              className="flex items-start gap-3 border border-[#C81E1E]/50 bg-[#C81E1E]/10 px-4 py-3.5 text-sm text-[#F5F5F3]"
            >
              <ShieldAlert
                className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="font-medium">Administrator privileges required</p>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  You are currently signed in as{" "}
                  <span className="text-[#F5F5F3]">{nonAdminUser.email}</span>,
                  which does not hold administrator access.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={signingOut}
                onClick={() => void handleSwitchAccount()}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-5 py-3 text-[11px] tracking-[0.2em] uppercase font-medium transition-colors cursor-pointer min-h-[46px] disabled:opacity-60"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {signingOut ? "Signing out..." : "Switch Account"}
                </span>
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center border border-white/15 px-5 py-3 text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-white/40 transition-colors min-h-[46px]"
              >
                Storefront
              </Link>
            </div>
          </div>
        ) : (
          <>
            {serverError && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2.5 border border-[#C81E1E]/50 bg-[#C81E1E]/10 px-4 py-3 text-sm text-[#F5F5F3]"
              >
                <AlertCircle
                  className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="leading-snug">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <AuthField
                id="admin-login-email"
                name="email"
                label="Administrator email"
                type="email"
                autoComplete="email"
                placeholder="admin@apexatelier.com"
                value={email}
                onChange={(val) => {
                  setEmail(val);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                error={fieldErrors.email}
                disabled={isSubmitting || isSuccess}
                inputRef={emailInputRef}
              />

              <AuthField
                id="admin-login-password"
                name="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(val) => {
                  setPassword(val);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      password: undefined,
                    }));
                  }
                }}
                error={fieldErrors.password}
                disabled={isSubmitting || isSuccess}
                inputRef={passwordInputRef}
              />

              <button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="w-full h-[52px] mt-2 inline-flex items-center justify-center gap-2 bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] text-xs font-medium tracking-[0.22em] uppercase transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSuccess ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    <span>Authorized · Entering Console</span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2
                      className="w-4 h-4 animate-spin"
                      aria-hidden="true"
                    />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Sign In to Console</span>
                )}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Footer Security Note */}
      <footer className="w-full max-w-6xl mx-auto flex items-center justify-center gap-2 text-xs text-[#71717A]">
        <Lock className="w-3.5 h-3.5 text-[#C81E1E]" aria-hidden="true" />
        <span>
          Protected by HTTP-only JWT cookies and server-side role enforcement.
        </span>
      </footer>
    </main>
  );
}
