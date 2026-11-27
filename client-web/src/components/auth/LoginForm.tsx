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
import { useCartStore } from "@/store/cart.store";
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

  const { formScopeRef, fadeOutOnSuccess } = useAuthFormAnimations();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

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

    // Calmly focus the first invalid field
    if (errors.email) {
      emailInputRef.current?.focus();
    } else if (errors.password) {
      passwordInputRef.current?.focus();
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
      const res = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      await useCartStore.getState().initForUser(res.user);

      setIsSuccess(true);
      setTimeout(() => {
        fadeOutOnSuccess(() => {
          router.push(redirectTarget);
          router.refresh();
        });
      }, 280);
    } catch (err) {
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
        <h1 className="font-serif text-3xl sm:text-4xl font-light leading-tight text-[#F5F5F3]">
          Welcome back
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Track orders, manage fitments and check out faster.
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-none border border-[#C81E1E]/50 bg-[#C81E1E]/10 px-4 py-3 text-sm text-[#F5F5F3]"
        >
          <AlertCircle className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5" />
          <p className="leading-snug">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField
          id="login-email"
          name="email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          inputRef={emailInputRef}
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
          inputRef={passwordInputRef}
          onChange={(val) => {
            setPassword(val);
            if (fieldErrors.password) {
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }
          }}
          error={fieldErrors.password}
          disabled={isSubmitting || isSuccess}
        />

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className="group relative h-[52px] w-full overflow-hidden rounded-none bg-[#F5F5F3] text-[#080808] px-6 text-sm font-medium transition-transform duration-150 active:scale-[0.985] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-[#C81E1E] focus-visible:outline-offset-2"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full bg-[#C81E1E] transition-transform duration-300 ease-out group-hover:translate-x-0"
            />
            <span className="relative z-10 flex items-center justify-center gap-2 transition-colors duration-300 group-hover:text-white">
              {isSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 group-hover:text-white" />
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
        onSuccess={async () => {
          setServerError(null);
          const user = await getCurrentUser().catch(() => null);
          if (user) {
            await useCartStore.getState().initForUser(user);
          }
          setIsSuccess(true);
          setTimeout(() => {
            fadeOutOnSuccess(() => {
              router.push(redirectTarget);
              router.refresh();
            });
          }, 280);
        }}
        onError={(msg) => setServerError(msg)}
      />

      <div className="pt-4 border-t border-white/10 flex items-center justify-between text-sm text-zinc-400">
        <span>New to Apex Atelier?</span>
        <Link
          href={registerHref}
          className="font-medium text-[#F5F5F3] hover:text-[#C81E1E] transition-colors"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
