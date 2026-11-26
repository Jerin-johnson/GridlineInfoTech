"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { gsap } from "@/lib/gsap";

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
  onFocusChange?: (focused: boolean) => void;
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
  onFocusChange,
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

  // Input focus animation: underline draws in + label eases up
  const animateFocus = (focused: boolean) => {
    onFocusChange?.(focused);
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

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
        color: focused ? "#F3F4F6" : "#C4C8D0",
        duration: 0.25,
        ease: "power3.out",
        overwrite: "auto",
      });
    }
  };

  return (
    <div className="auth-field-item">
      <label
        ref={labelRef}
        htmlFor={id}
        className="block text-sm font-medium text-[#C4C8D0] mb-2"
      >
        {label}
      </label>

      <div className="relative">
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
          className={`h-14 w-full rounded-none bg-[#17191E] border px-4 text-base text-[#F3F4F6] placeholder:text-[#7F8592] transition-colors focus:outline-none focus:ring-1 disabled:opacity-50 ${
            isPasswordField ? "pr-12" : ""
          } ${
            error
              ? "border-[#D13423] focus:border-[#D13423] focus:ring-[#D13423]/60"
              : "border-[#2A2D35] focus:border-[#B8BDC7] focus:ring-[#B8BDC7]/40"
          }`}
        />

        {/* Animated focus underline */}
        <span
          ref={underlineRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] origin-left scale-x-0 bg-[#D13423]"
        />

        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 px-4 flex items-center text-[#9CA3AF] hover:text-[#F3F4F6] transition-colors cursor-pointer focus-visible:outline-1 focus-visible:outline-[#F3F4F6]"
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
        <p id={`${id}-error`} className="mt-1.5 text-xs text-[#F87171]">
          {error}
        </p>
      )}
    </div>
  );
}
