"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  getCurrentUser,
  getSafeRedirectPath,
  loginUser,
} from "@/lib/api/auth.api";
import { ApiError } from "@/lib/api/client";
import { gsap } from "@/lib/gsap";
import { AuthField } from "./AuthField";
import { AuthShell } from "./AuthShell";
import { GoogleAuthButton } from "./GoogleAuthButton";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = getSafeRedirectPath(searchParams.get("redirect"));
  const registerHref = searchParams.get("redirect")
    ? `/register?redirect=${encodeURIComponent(redirectTarget)}`
    : "/register";

  const formRef = useRef<HTMLFormElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

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

  // Short horizontal shake on failed login (disabled under reduced motion)
  const triggerErrorShake = () => {
    if (
      !formRef.current ||
      (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      return;
    }

    gsap.fromTo(
      formRef.current,
      { x: -7 },
      {
        x: 0,
        duration: 0.42,
        ease: "power3.out",
        keyframes: [{ x: -7 }, { x: 7 }, { x: -4 }, { x: 4 }, { x: 0 }],
        clearProps: "transform",
      },
    );
  };

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = "Enter your email address.";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = "Enter a valid email address (for example, alex@domain.com).";
    }

    if (!password) {
      errors.password = "Enter your password.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (!validate()) {
      triggerErrorShake();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      setSuccessMessage(`Welcome back, ${result.user.firstName}.`);
      setTimeout(() => {
        router.push(redirectTarget);
        router.refresh();
      }, 420);
    } catch (err) {
      triggerErrorShake();
      if (err instanceof ApiError) {
        setServerError(
          err.status === 401
            ? "Email or password is incorrect. Check your credentials and try again."
            : err.message,
        );
      } else {
        setServerError("Unable to sign in right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSuccess = Boolean(successMessage);

  return (
    <AuthShell
      headline="Welcome back"
      supportingCopy="Track orders, manage fitments and check out faster."
      posterImage="https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1600&q=85"
      posterAlt="Performance coupe wheel and brake hardware in studio lighting"
      isPasswordFocused={isPasswordFocused}
      isSuccess={isSuccess}
    >
      <div className="space-y-6">
        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-3 border border-[#D13423]/60 bg-[#D13423]/12 px-4 py-3.5 text-sm text-[#F3F4F6]"
          >
            <AlertCircle className="w-4 h-4 text-[#D13423] shrink-0 mt-0.5" />
            <p className="leading-relaxed">{serverError}</p>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="flex items-start gap-3 border border-emerald-500/40 bg-emerald-500/10 px-4 py-3.5 text-sm text-[#F3F4F6]"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{successMessage}</p>
          </div>
        )}

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5"
        >
          <AuthField
            id="login-email"
            name="email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="alex@apexatelier.com"
            value={email}
            onChange={(val) => {
              setEmail(val);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            error={fieldErrors.email}
            disabled={isSubmitting || isSuccess}
          />

          <AuthField
            id="login-password"
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(val) => {
              setPassword(val);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            onFocusChange={setIsPasswordFocused}
            error={fieldErrors.password}
            disabled={isSubmitting || isSuccess}
          />

          <div className="auth-field-item pt-1">
            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className="group relative h-14 w-full overflow-hidden rounded-none bg-[#F3F4F6] text-[#0A0B0E] px-6 text-sm font-medium transition-transform duration-150 active:scale-[0.985] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F3F4F6] focus-visible:outline-offset-2"
            >
              {/* Smooth fill sweep on hover */}
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-[#D13423] transition-transform duration-300 ease-out group-hover:translate-x-0"
              />
              <span className="relative z-10 flex items-center justify-center gap-2.5 transition-colors duration-300 group-hover:text-[#F3F4F6]">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
              </span>
            </button>
          </div>
        </form>

        <GoogleAuthButton
          mode="login"
          disabled={isSubmitting || isSuccess}
          onSuccess={(user) => {
            setServerError(null);
            setSuccessMessage(`Welcome back, ${user.firstName}.`);
            setTimeout(() => {
              router.push(redirectTarget);
              router.refresh();
            }, 420);
          }}
          onError={(msg) => {
            triggerErrorShake();
            setServerError(msg);
          }}
        />

        <div className="auth-field-item pt-5 border-t border-white/10 flex items-center justify-between text-sm text-[#C4C8D0]">
          <span>New to Apex Atelier?</span>
          <Link
            href={registerHref}
            className="font-medium text-[#F3F4F6] hover:text-[#D13423] transition-colors underline underline-offset-4 decoration-white/25 hover:decoration-[#D13423]"
          >
            Create account
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
