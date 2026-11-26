"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import {
  getCurrentUser,
  getSafeRedirectPath,
  loginUser,
} from "@/lib/api/auth.api";
import { ApiError } from "@/lib/api/client";
import { AuthField } from "./AuthField";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { useAuthFormAnimations } from "./useAuthAnimations";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = getSafeRedirectPath(searchParams.get("redirect"));
  const registerHref = searchParams.get("redirect")
    ? `/register?redirect=${encodeURIComponent(redirectTarget)}`
    : "/register";

  const { formScopeRef, shakeElement, fadeOutOnSuccess } =
    useAuthFormAnimations();
  const formRef = useRef<HTMLFormElement>(null);
  const emailFieldRef = useRef<HTMLDivElement>(null);
  const passwordFieldRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
      errors.email = "Please enter your email address.";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = "That doesn’t look like a valid email address.";
    }

    if (!password) {
      errors.password = "Please enter your password.";
    }

    setFieldErrors(errors);

    if (errors.email) {
      shakeElement(emailFieldRef.current);
    } else if (errors.password) {
      shakeElement(passwordFieldRef.current);
    }

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      setIsSuccess(true);
      // ANIMATION 5b: Clean fade-out after button check morph
      setTimeout(() => {
        fadeOutOnSuccess(() => {
          router.push(redirectTarget);
          router.refresh();
        });
      }, 320);
    } catch (err) {
      shakeElement(formRef.current);
      if (err instanceof ApiError) {
        setServerError(
          err.status === 401
            ? "Email or password is incorrect. Please check and try again."
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
    <div ref={formScopeRef} className="space-y-6">
      <div className="space-y-2">
        <div className="overflow-hidden">
          <h1 className="auth-heading-line font-serif text-3xl sm:text-4xl font-normal leading-tight text-[#F2F1ED]">
            Welcome back
          </h1>
        </div>
        <p className="auth-stagger-item text-sm text-[#A0A4AE] leading-relaxed">
          Track orders, manage fitments and check out faster.
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-[7px] border border-[#B83227]/45 bg-[#B83227]/10 px-4 py-3 text-sm text-[#F2F1ED]"
        >
          <AlertCircle className="w-4 h-4 text-[#B83227] shrink-0 mt-0.5" />
          <p className="leading-snug">{serverError}</p>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        <AuthField
          id="login-email"
          name="email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          containerRef={emailFieldRef}
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
          containerRef={passwordFieldRef}
          onChange={(val) => {
            setPassword(val);
            if (fieldErrors.password) {
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }
          }}
          error={fieldErrors.password}
          disabled={isSubmitting || isSuccess}
        />

        {/* ANIMATION 5a: Primary button with hover fill sweep, 0.98 press, spinner -> check */}
        <div className="auth-stagger-item pt-2">
          <button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className="group relative h-[52px] w-full overflow-hidden rounded-[7px] bg-[#F2F1ED] text-[#0E0F12] px-6 text-sm font-medium transition-transform duration-150 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-[#B83227] focus-visible:outline-offset-2"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full bg-[#B83227] transition-transform duration-300 ease-out group-hover:translate-x-0"
            />
            <span className="relative z-10 flex items-center justify-center gap-2 transition-colors duration-300 group-hover:text-[#F2F1ED]">
              {isSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 group-hover:text-[#F2F1ED] transition-transform duration-200 scale-110" />
                  <span>Signed in</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </span>
          </button>
        </div>
      </form>

      <GoogleAuthButton
        mode="login"
        disabled={isSubmitting || isSuccess}
        onSuccess={() => {
          setServerError(null);
          setIsSuccess(true);
          setTimeout(() => {
            fadeOutOnSuccess(() => {
              router.push(redirectTarget);
              router.refresh();
            });
          }, 320);
        }}
        onError={(msg) => {
          shakeElement(formRef.current);
          setServerError(msg);
        }}
      />

      <div className="auth-stagger-item pt-4 border-t border-white/[0.08] flex items-center justify-between text-sm text-[#A0A4AE]">
        <span>New to Apex Atelier?</span>
        <Link
          href={registerHref}
          className="font-medium text-[#F2F1ED] hover:text-[#B83227] transition-colors"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
