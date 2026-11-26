"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import {
  getCurrentUser,
  getSafeRedirectPath,
  registerUser,
} from "@/lib/api/auth.api";
import { ApiError } from "@/lib/api/client";
import { AuthField } from "./AuthField";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { useAuthFormAnimations } from "./useAuthAnimations";

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

// ANIMATION 4: Password rule item with smooth color fade + SVG stroke-draw check mark
function PasswordRuleItem({ met, label }: { met: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-1.5 text-xs transition-colors duration-300 ${
        met ? "text-[#F2F1ED]" : "text-[#7A808D]"
      }`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle
          cx="8"
          cy="8"
          r="6.5"
          className={`transition-colors duration-300 ${
            met ? "stroke-emerald-400" : "stroke-white/15"
          }`}
          strokeWidth="1.2"
        />
        <path
          d="M5 8.2L7 10.2L11.2 5.8"
          className="stroke-emerald-400 transition-all duration-300 ease-out"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="12"
          strokeDashoffset={met ? 0 : 12}
        />
      </svg>
      <span>{label}</span>
    </li>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = getSafeRedirectPath(searchParams.get("redirect"));
  const loginHref = searchParams.get("redirect")
    ? `/login?redirect=${encodeURIComponent(redirectTarget)}`
    : "/login";

  const { formScopeRef, shakeElement, fadeOutOnSuccess } =
    useAuthFormAnimations();
  const formRef = useRef<HTMLFormElement>(null);
  const firstNameRef = useRef<HTMLDivElement>(null);
  const lastNameRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
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

  const hasMinLength = password.length >= 8 && password.length <= 64;
  const hasCaseMix = /[A-Z]/.test(password) && /[a-z]/.test(password);
  const hasNumberOrSpecial = /(\d|\W)/.test(password);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const validate = (): boolean => {
    const errors: RegisterFieldErrors = {};

    if (!firstName.trim()) {
      errors.firstName = "Please enter your first name.";
    } else if (firstName.trim().length > 50) {
      errors.firstName = "First name must be 50 characters or fewer.";
    }

    if (!lastName.trim()) {
      errors.lastName = "Please enter your last name.";
    } else if (lastName.trim().length > 50) {
      errors.lastName = "Last name must be 50 characters or fewer.";
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = "Please enter your email address.";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = "That doesn’t look like a valid email address.";
    }

    if (!password) {
      errors.password = "Please create a password.";
    } else if (password.length < 8 || password.length > 64) {
      errors.password = "Password must be between 8 and 64 characters.";
    } else if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
      errors.password =
        "Include uppercase, lowercase, and at least one number or symbol.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Those passwords don’t match yet.";
    }

    setFieldErrors(errors);

    if (errors.firstName) shakeElement(firstNameRef.current);
    else if (errors.lastName) shakeElement(lastNameRef.current);
    else if (errors.email) shakeElement(emailRef.current);
    else if (errors.password) shakeElement(passwordRef.current);
    else if (errors.confirmPassword) shakeElement(confirmRef.current);

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
      await registerUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      setIsSuccess(true);
      setTimeout(() => {
        fadeOutOnSuccess(() => {
          router.push(redirectTarget);
          router.refresh();
        });
      }, 320);
    } catch (err) {
      shakeElement(formRef.current);
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Unable to create your account right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={formScopeRef} className="space-y-4">
      <div className="space-y-1.5">
        <div className="overflow-hidden">
          <h1 className="auth-heading-line font-serif text-3xl sm:text-4xl font-normal leading-tight text-[#F2F1ED]">
            Create your account
          </h1>
        </div>
        <p className="auth-stagger-item text-sm text-[#A0A4AE] leading-relaxed">
          Save delivery addresses, track orders and check out faster.
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
        className="space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AuthField
            id="register-first-name"
            name="firstName"
            label="First name"
            type="text"
            autoComplete="given-name"
            placeholder="Alex"
            value={firstName}
            containerRef={firstNameRef}
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
            containerRef={lastNameRef}
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
          placeholder="you@example.com"
          value={email}
          containerRef={emailRef}
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
          placeholder="At least 8 characters"
          value={password}
          containerRef={passwordRef}
          onChange={(val) => {
            setPassword(val);
            if (fieldErrors.password) {
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }
          }}
          error={fieldErrors.password}
          disabled={isSubmitting || isSuccess}
        />

        {/* Compact password checklist directly below password */}
        <ul className="auth-stagger-item grid grid-cols-2 gap-x-4 gap-y-1.5 px-0.5 py-0.5">
          <PasswordRuleItem met={hasMinLength} label="8–64 characters" />
          <PasswordRuleItem met={hasCaseMix} label="Upper & lowercase" />
          <PasswordRuleItem met={hasNumberOrSpecial} label="Number or symbol" />
          <PasswordRuleItem met={passwordsMatch} label="Passwords match" />
        </ul>

        <AuthField
          id="register-confirm-password"
          name="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          containerRef={confirmRef}
          onChange={(val) => {
            setConfirmPassword(val);
            if (fieldErrors.confirmPassword) {
              setFieldErrors((prev) => ({
                ...prev,
                confirmPassword: undefined,
              }));
            }
          }}
          error={fieldErrors.confirmPassword}
          disabled={isSubmitting || isSuccess}
        />

        <div className="auth-stagger-item pt-1">
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
                  <span>Account created</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create account</span>
              )}
            </span>
          </button>
        </div>
      </form>

      <GoogleAuthButton
        mode="register"
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

      <div className="auth-stagger-item pt-3 border-t border-white/[0.08] flex items-center justify-between text-sm text-[#A0A4AE]">
        <span>Already have an account?</span>
        <Link
          href={loginHref}
          className="font-medium text-[#F2F1ED] hover:text-[#B83227] transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
