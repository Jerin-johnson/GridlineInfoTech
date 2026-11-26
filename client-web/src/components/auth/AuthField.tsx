"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "./useAuthAnimations";

interface AuthFieldProps {
  id: string;
  name: string;
  label: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function AuthField({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  containerRef,
}: AuthFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const labelRef = useRef<HTMLLabelElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);

  const isPasswordField = type === "password";
  const resolvedType = isPasswordField
    ? showPassword
      ? "text"
      : "password"
    : type;

  // ANIMATION 3: Input focus — label floats up, 1px accent line draws L->R, border brightens softly
  const animateFocus = (focused: boolean) => {
    if (prefersReducedMotion()) return;

    if (underlineRef.current) {
      gsap.to(underlineRef.current, {
        scaleX: focused ? 1 : 0,
        duration: 0.35,
        ease: "power3.out",
        overwrite: "auto",
      });
    }

    if (labelRef.current) {
      gsap.to(labelRef.current, {
        y: focused ? -2 : 0,
        color: focused ? "#F2F1ED" : "#A0A4AE",
        duration: 0.25,
        ease: "power3.out",
        overwrite: "auto",
      });
    }
  };

  return (
    <div ref={containerRef} className="auth-stagger-item">
      <label
        ref={labelRef}
        htmlFor={id}
        className="block text-sm font-medium text-[#A0A4AE] mb-1.5"
      >
        {label}
      </label>

      <div className="relative overflow-hidden rounded-[7px]">
        <input
          id={id}
          name={name}
          type={resolvedType}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => animateFocus(true)}
          onBlur={() => animateFocus(false)}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder={placeholder}
          className={`h-[52px] w-full rounded-[7px] bg-[#1A1C22] border px-4 text-base text-[#F2F1ED] placeholder:text-[#5B606B] transition-colors duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 ${
            isPasswordField ? "pr-12" : ""
          } ${
            error
              ? "border-[#B83227]/80 focus:border-[#B83227] focus:ring-[#B83227]/35"
              : "border-white/[0.08] hover:border-white/[0.16] focus:border-[#B83227]/65 focus:ring-[#B83227]/30"
          }`}
        />

        {/* 1px accent underline drawing left-to-right on focus */}
        <span
          ref={underlineRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1.5px] origin-left scale-x-0 bg-[#B83227]"
        />

        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 px-3.5 flex items-center text-[#8B909C] hover:text-[#F2F1ED] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#B83227]"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {error && (
        <p
          id={`${id}-error`}
          aria-live="polite"
          className="mt-1.5 text-xs text-[#F87171]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
