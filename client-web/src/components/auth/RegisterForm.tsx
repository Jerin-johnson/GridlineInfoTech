"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import {
  getCurrentUser,
  getSafeRedirectPath,
  registerUser,
} from "@/lib/api/auth.api";
import { ApiError } from "@/lib/api/client";
import { GoogleAuthButton } from "./GoogleAuthButton";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_COMPLEXITY_REGEX =
  /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

interface RegisterFieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = getSafeRedirectPath(searchParams.get("redirect"));
  const loginHref = searchParams.get("redirect")
    ? `/login?redirect=${encodeURIComponent(redirectTarget)}`
    : "/login";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
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

  const hasMinLength = password.length >= 8 && password.length <= 64;
  const hasCaseMix = /[A-Z]/.test(password) && /[a-z]/.test(password);
  const hasNumberOrSpecial = /(\d|\W)/.test(password);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const validate = (): boolean => {
    const errors: RegisterFieldErrors = {};

    if (!firstName.trim()) {
      errors.firstName = "First name is required";
    } else if (firstName.trim().length > 50) {
      errors.firstName = "First name cannot exceed 50 characters";
    }

    if (!lastName.trim()) {
      errors.lastName = "Last name is required";
    } else if (lastName.trim().length > 50) {
      errors.lastName = "Last name cannot exceed 50 characters";
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = "Email address is required";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = "Enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8 || password.length > 64) {
      errors.password = "Password must be between 8 and 64 characters";
    } else if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
      errors.password =
        "Must include uppercase, lowercase, and a number or special character";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
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
      const result = await registerUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      setSuccessMessage(
        `Account created for ${result.user.firstName}. Redirecting...`,
      );
      router.push(redirectTarget);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Unable to create account right now. Please try again.");
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

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="register-first-name"
              className="block text-[10px] tracking-[0.22em] uppercase text-zinc-400 mb-2"
            >
              First Name
            </label>
            <input
              id="register-first-name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (fieldErrors.firstName) {
                  setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
                }
              }}
              disabled={isSubmitting || Boolean(successMessage)}
              aria-invalid={Boolean(fieldErrors.firstName)}
              placeholder="Alex"
              className="w-full rounded-none bg-[#141417]/70 border border-white/15 px-4 py-3 text-sm text-[#F5F5F3] placeholder:text-zinc-600 focus:border-white/60 focus:outline-none transition-colors disabled:opacity-50"
            />
            {fieldErrors.firstName && (
              <p className="mt-1.5 text-xs text-[#C81E1E]">
                {fieldErrors.firstName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="register-last-name"
              className="block text-[10px] tracking-[0.22em] uppercase text-zinc-400 mb-2"
            >
              Last Name
            </label>
            <input
              id="register-last-name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (fieldErrors.lastName) {
                  setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
                }
              }}
              disabled={isSubmitting || Boolean(successMessage)}
              aria-invalid={Boolean(fieldErrors.lastName)}
              placeholder="Vance"
              className="w-full rounded-none bg-[#141417]/70 border border-white/15 px-4 py-3 text-sm text-[#F5F5F3] placeholder:text-zinc-600 focus:border-white/60 focus:outline-none transition-colors disabled:opacity-50"
            />
            {fieldErrors.lastName && (
              <p className="mt-1.5 text-xs text-[#C81E1E]">
                {fieldErrors.lastName}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="register-email"
            className="block text-[10px] tracking-[0.22em] uppercase text-zinc-400 mb-2"
          >
            Email Address
          </label>
          <input
            id="register-email"
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
            placeholder="alex@apexatelier.com"
            className="w-full rounded-none bg-[#141417]/70 border border-white/15 px-4 py-3 text-sm text-[#F5F5F3] placeholder:text-zinc-600 focus:border-white/60 focus:outline-none transition-colors disabled:opacity-50"
          />
          {fieldErrors.email && (
            <p className="mt-1.5 text-xs text-[#C81E1E]">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="block text-[10px] tracking-[0.22em] uppercase text-zinc-400 mb-2"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="register-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              disabled={isSubmitting || Boolean(successMessage)}
              aria-invalid={Boolean(fieldErrors.password)}
              placeholder="Minimum 8 characters"
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
            <p className="mt-1.5 text-xs text-[#C81E1E]">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="register-confirm-password"
            className="block text-[10px] tracking-[0.22em] uppercase text-zinc-400 mb-2"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined,
                  }));
                }
              }}
              disabled={isSubmitting || Boolean(successMessage)}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              placeholder="Re-enter your password"
              className="w-full rounded-none bg-[#141417]/70 border border-white/15 pl-4 pr-11 py-3 text-sm text-[#F5F5F3] placeholder:text-zinc-600 focus:border-white/60 focus:outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
              aria-pressed={showConfirmPassword}
              className="absolute inset-y-0 right-0 px-3.5 flex items-center text-zinc-400 hover:text-[#F5F5F3] transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-white/70"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="mt-1.5 text-xs text-[#C81E1E]">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        {/* Password Requirements Checklist */}
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 text-[11px] text-zinc-500">
          <li
            className={`flex items-center gap-1.5 transition-colors ${
              hasMinLength ? "text-emerald-400" : ""
            }`}
          >
            <Check className="w-3 h-3 shrink-0" />
            <span>8–64 characters</span>
          </li>
          <li
            className={`flex items-center gap-1.5 transition-colors ${
              hasCaseMix ? "text-emerald-400" : ""
            }`}
          >
            <Check className="w-3 h-3 shrink-0" />
            <span>Upper &amp; lowercase</span>
          </li>
          <li
            className={`flex items-center gap-1.5 transition-colors ${
              hasNumberOrSpecial ? "text-emerald-400" : ""
            }`}
          >
            <Check className="w-3 h-3 shrink-0" />
            <span>Number or symbol</span>
          </li>
          <li
            className={`flex items-center gap-1.5 transition-colors ${
              passwordsMatch ? "text-emerald-400" : ""
            }`}
          >
            <Check className="w-3 h-3 shrink-0" />
            <span>Passwords match</span>
          </li>
        </ul>

        <button
          type="submit"
          disabled={isSubmitting || Boolean(successMessage)}
          className="w-full rounded-none bg-[#F5F5F3] text-[#080808] px-7 py-3.5 text-[11px] tracking-[0.22em] uppercase font-medium hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 cursor-pointer mt-2"
        >
          {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{isSubmitting ? "Creating Account..." : "Create Account"}</span>
        </button>
      </form>

      <GoogleAuthButton
        mode="register"
        disabled={isSubmitting || Boolean(successMessage)}
        onSuccess={(user) => {
          setServerError(null);
          setSuccessMessage(
            `Account ready, ${user.firstName}. Redirecting...`,
          );
          router.push(redirectTarget);
          router.refresh();
        }}
        onError={(msg) => setServerError(msg)}
      />

      <div className="pt-5 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
        <span>Already have an account?</span>
        <Link
          href={loginHref}
          className="text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:text-[#C81E1E] transition-colors"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
