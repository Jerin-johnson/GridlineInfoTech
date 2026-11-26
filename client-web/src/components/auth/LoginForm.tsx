"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  getCurrentUser,
  getSafeRedirectPath,
  loginUser,
} from "@/lib/api/auth.api";
import { ApiError } from "@/lib/api/client";
import { GoogleAuthButton } from "./GoogleAuthButton";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = getSafeRedirectPath(searchParams.get("redirect"));
  const registerHref = searchParams.get("redirect")
    ? `/register?redirect=${encodeURIComponent(redirectTarget)}`
    : "/register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (active && user) {
          router.replace(redirectTarget);
        }
      })
      .catch(() => {
        // Ignore transient check errors on initial mount
      });
    return () => {
      active = false;
    };
  }, [router, redirectTarget]);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = "Email address is required";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = "Enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      setSuccessMessage(
        `Welcome back, ${result.user.firstName}. Redirecting...`,
      );
      router.push(redirectTarget);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Unable to sign in right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-3 border border-[#C81E1E]/50 bg-[#C81E1E]/10 px-4 py-3 text-xs text-[#F5F5F3]"
        >
          <AlertCircle className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5" />
          <p className="leading-relaxed">{serverError}</p>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-3 border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-[#F5F5F3]"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="login-email"
            className="block text-[10px] tracking-[0.22em] uppercase text-zinc-400 mb-2"
          >
            Email Address
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            disabled={isSubmitting || Boolean(successMessage)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? "login-email-error" : undefined
            }
            placeholder="alex@apexatelier.com"
            className="w-full rounded-none bg-[#141417]/70 border border-white/15 px-4 py-3 text-sm text-[#F5F5F3] placeholder:text-zinc-600 focus:border-white/60 focus:outline-none transition-colors disabled:opacity-50"
          />
          {fieldErrors.email && (
            <p
              id="login-email-error"
              className="mt-1.5 text-xs text-[#C81E1E]"
            >
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-[10px] tracking-[0.22em] uppercase text-zinc-400 mb-2"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              disabled={isSubmitting || Boolean(successMessage)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "login-password-error" : undefined
              }
              placeholder="Enter your password"
              className="w-full rounded-none bg-[#141417]/70 border border-white/15 pl-4 pr-11 py-3 text-sm text-[#F5F5F3] placeholder:text-zinc-600 focus:border-white/60 focus:outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 px-3.5 flex items-center text-zinc-400 hover:text-[#F5F5F3] transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <p
              id="login-password-error"
              className="mt-1.5 text-xs text-[#C81E1E]"
            >
              {fieldErrors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || Boolean(successMessage)}
          className="w-full rounded-none bg-[#F5F5F3] text-[#080808] px-7 py-3.5 text-[11px] tracking-[0.22em] uppercase font-medium hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 cursor-pointer"
        >
          {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{isSubmitting ? "Authenticating..." : "Sign In"}</span>
        </button>
      </form>

      <GoogleAuthButton
        mode="login"
        disabled={isSubmitting || Boolean(successMessage)}
        onSuccess={(user) => {
          setServerError(null);
          setSuccessMessage(
            `Welcome back, ${user.firstName}. Redirecting...`,
          );
          router.push(redirectTarget);
          router.refresh();
        }}
        onError={(msg) => setServerError(msg)}
      />

      <div className="pt-5 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
        <span>New to APEX ATELIER?</span>
        <Link
          href={registerHref}
          className="text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:text-[#C81E1E] transition-colors"
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}
