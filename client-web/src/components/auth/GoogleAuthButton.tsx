"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { googleAuth } from "@/lib/api/auth.api";
import { ApiError } from "@/lib/api/client";
import type { AuthenticatedUser } from "@/types/auth.types";

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: "outline" | "filled_black" | "filled_blue";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      width?: number;
    },
  ) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

interface GoogleAuthButtonProps {
  mode: "login" | "register";
  disabled?: boolean;
  onSuccess: (user: AuthenticatedUser) => void;
  onError: (message: string) => void;
}

export function GoogleAuthButton({
  mode,
  disabled = false,
  onSuccess,
  onError,
}: GoogleAuthButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!clientId || !scriptLoaded || !buttonRef.current) {
      return;
    }

    const googleId = window.google?.accounts?.id;
    if (!googleId) {
      return;
    }

    googleId.initialize({
      client_id: clientId,
      callback: async (response: GoogleCredentialResponse) => {
        if (!response.credential) {
          onErrorRef.current("Google authentication did not return a credential.");
          return;
        }

        setIsSubmitting(true);
        try {
          const authResponse = await googleAuth({
            credential: response.credential,
          });
          onSuccessRef.current(authResponse.user);
        } catch (err) {
          if (err instanceof ApiError) {
            onErrorRef.current(err.message);
          } else {
            onErrorRef.current("Google authentication failed. Please try again.");
          }
        } finally {
          setIsSubmitting(false);
        }
      },
    });

    buttonRef.current.innerHTML = "";
    googleId.renderButton(buttonRef.current, {
      theme: "filled_black",
      size: "large",
      text: mode === "register" ? "signup_with" : "continue_with",
      shape: "rectangular",
      width: Math.min(buttonRef.current.offsetWidth || 360, 400),
    });
  }, [clientId, scriptLoaded, mode]);

  if (!clientId) {
    return null;
  }

  return (
    <div className="space-y-4 pt-1">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />

      <div className="relative flex items-center justify-center">
        <span className="h-[1px] w-full bg-white/10" />
        <span className="bg-[#0D0D0F] px-3 text-xs text-zinc-500 whitespace-nowrap">
          or
        </span>
        <span className="h-[1px] w-full bg-white/10" />
      </div>

      <div
        className={`relative min-h-[44px] flex items-center justify-center rounded-none border border-white/10 bg-[#141417] overflow-hidden transition-opacity ${
          disabled || isSubmitting ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <div ref={buttonRef} className="w-full flex justify-center" />
        {!scriptLoaded && (
          <span className="text-xs text-zinc-400">
            Loading Google sign-in...
          </span>
        )}
      </div>
    </div>
  );
}
