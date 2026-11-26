"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Check, CheckCircle2, Loader2 } from "lucide-react";
import {
  getCurrentUser,
  getSafeRedirectPath,
  registerUser,
} from "@/lib/api/auth.api";
import { ApiError } from "@/lib/api/client";
import { gsap } from "@/lib/gsap";
import { AuthField } from "./AuthField";
import { AuthShell } from "./AuthShell";
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

  const formRef = useRef<HTMLFormElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

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

  const hasMinLength = password.length >= 8 && password.length <= 64;
  const hasCaseMix = /[A-Z]/.test(password) && /[a-z]/.test(password);
  const hasNumberOrSpecial = /(\d|\W)/.test(password);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const validate = (): boolean => {
    const errors: RegisterFieldErrors = {};

    if (!firstName.trim()) {
      errors.firstName = "Enter your first name.";
    } else if (firstName.trim().length > 50) {
      errors.firstName = "First name cannot exceed 50 characters.";
    }

    if (!lastName.trim()) {
      errors.lastName = "Enter your last name.";
    } else if (lastName.trim().length > 50) {
      errors.lastName = "Last name cannot exceed 50 characters.";
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = "Enter your email address.";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = "Enter a valid email address (for example, alex@domain.com).";
    }

    if (!password) {
      errors.password = "Create a password.";
    } else if (password.length < 8 || password.length > 64) {
      errors.password = "Password must be between 8 and 64 characters.";
    } else if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
      errors.password =
        "Include uppercase, lowercase, and at least one number or symbol.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
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
      const result = await registerUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      setSuccessMessage(`Account created for ${result.user.firstName}.`);
      setTimeout(() => {
        router.push(redirectTarget);
        router.refresh();
      }, 420);
    } catch (err) {
      triggerErrorShake();
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Unable to create account right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSuccess = Boolean(successMessage);

  return (
    <AuthShell
      headline="Create your account"
      supportingCopy="Save delivery addresses, track orders and check out faster."
      posterImage="https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=85"
      posterAlt="Forged automotive performance hardware in dark studio"
      isPasswordFocused={isPasswordFocused}
      isSuccess={isSuccess}
    >
      <div className="space-y-5">
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
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AuthField
              id="register-first-name"
              name="firstName"
              label="First name"
              type="text"
              autoComplete="given-name"
              placeholder="Alex"
              value={firstName}
              onChange={(val) => {
                setFirstName(val);
                if (fieldErrors.firstName) {
                  setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
                }
              }}
              error={fieldErrors.firstName}
              disabled={isSubmitting || isSuccess}
            />

            <AuthField
              id="register-last-name"
              name="lastName"
              label="Last name"
              type="text"
              autoComplete="family-name"
              placeholder="Vance"
              value={lastName}
              onChange={(val) => {
                setLastName(val);
                if (fieldErrors.lastName) {
                  setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
                }
              }}
              error={fieldErrors.lastName}
              disabled={isSubmitting || isSuccess}
            />
          </div>

          <AuthField
            id="register-email"
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
            id="register-password"
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
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

          <AuthField
            id="register-confirm-password"
            name="confirmPassword"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(val) => {
              setConfirmPassword(val);
              if (fieldErrors.confirmPassword) {
                setFieldErrors((prev) => ({
                  ...prev,
                  confirmPassword: undefined,
                }));
              }
            }}
            onFocusChange={setIsPasswordFocused}
            error={fieldErrors.confirmPassword}
            disabled={isSubmitting || isSuccess}
          />

          <ul className="auth-field-item grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 text-xs text-[#9CA3AF]">
            <li
              className={`flex items-center gap-1.5 transition-colors ${
                hasMinLength ? "text-emerald-400" : ""
              }`}
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>8–64 characters</span>
            </li>
            <li
              className={`flex items-center gap-1.5 transition-colors ${
                hasCaseMix ? "text-emerald-400" : ""
              }`}
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Upper &amp; lowercase</span>
            </li>
            <li
              className={`flex items-center gap-1.5 transition-colors ${
                hasNumberOrSpecial ? "text-emerald-400" : ""
              }`}
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Number or symbol</span>
            </li>
            <li
              className={`flex items-center gap-1.5 transition-colors ${
                passwordsMatch ? "text-emerald-400" : ""
              }`}
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Passwords match</span>
            </li>
          </ul>

          <div className="auth-field-item pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className="group relative h-14 w-full overflow-hidden rounded-none bg-[#F3F4F6] text-[#0A0B0E] px-6 text-sm font-medium transition-transform duration-150 active:scale-[0.985] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F3F4F6] focus-visible:outline-offset-2"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-[#D13423] transition-transform duration-300 ease-out group-hover:translate-x-0"
              />
              <span className="relative z-10 flex items-center justify-center gap-2.5 transition-colors duration-300 group-hover:text-[#F3F4F6]">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {isSubmitting ? "Creating account..." : "Create account"}
                </span>
              </span>
            </button>
          </div>
        </form>

        <GoogleAuthButton
          mode="register"
          disabled={isSubmitting || isSuccess}
          onSuccess={(user) => {
            setServerError(null);
            setSuccessMessage(`Account ready, ${user.firstName}.`);
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
          <span>Already have an account?</span>
          <Link
            href={loginHref}
            className="font-medium text-[#F3F4F6] hover:text-[#D13423] transition-colors underline underline-offset-4 decoration-white/25 hover:decoration-[#D13423]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
