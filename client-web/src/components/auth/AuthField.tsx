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
  onFocus?: () => void;
  error?: string;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
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
  onFocus,
  error,
  disabled = false,
  inputRef,
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

  // ANIMATION 4: Calm focus feedback — 1px crimson underline draws L->R + label brightens
  const animateFocus = (focused: boolean) => {
    if (focused) onFocus?.();
    if (prefersReducedMotion()) return;

    if (underlineRef.current) {
      gsap.to(underlineRef.current, {
        scaleX: focused ? 1 : 0,
        duration: 0.3,
        ease: "power3.out",
        overwrite: "auto",
      });
    }

    if (labelRef.current) {
      gsap.to(labelRef.current, {
        color: focused ? "#F5F5F3" : "#A1A1AA",
        duration: 0.2,
        ease: "power3.out",
        overwrite: "auto",
      });
    }
  };

  return (
    <div>
      <label
        ref={labelRef}
        htmlFor={id}
        className="block text-sm font-medium text-zinc-400 mb-1.5"
      >
        {label}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
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
          className={`h-[52px] w-full rounded-none bg-[#141417] border px-4 text-base text-[#F5F5F3] placeholder:text-zinc-600 transition-colors duration-200 focus:outline-none focus:ring-1 disabled:opacity-50 ${
            isPasswordField ? "pr-12" : ""
          } ${
            error
              ? "border-[#C81E1E] focus:border-[#C81E1E] focus:ring-[#C81E1E]/60"
              : "border-white/10 hover:border-white/20 focus:border-white/40 focus:ring-white/25"
          }`}
        />

        {/* 1px crimson accent underline drawing left-to-right on focus */}
        <span
          ref={underlineRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1.5px] origin-left scale-x-0 bg-[#C81E1E]"
        />

        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 px-3.5 flex items-center text-zinc-400 hover:text-[#F5F5F3] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F5F5F3]"
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
