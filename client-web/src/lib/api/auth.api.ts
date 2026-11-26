import { apiFetch, ApiError } from "@/lib/api/client";
import type {
  AuthResponse,
  GoogleAuthPayload,
  LoginPayload,
  RegisterPayload,
  SafeUserProfile,
  UserProfileResponse,
} from "@/types/auth.types";

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerUser(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function googleAuth(
  payload: GoogleAuthPayload,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(): Promise<SafeUserProfile | null> {
  try {
    const response = await apiFetch<UserProfileResponse>("/users/me", {
      method: "GET",
      cache: "no-store",
    });
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  await apiFetch<{ message: string }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Validates post-authentication redirect targets to prevent open-redirect vulnerabilities.
 * Only relative internal paths starting with a single '/' are permitted.
 */
export function getSafeRedirectPath(redirect?: string | null): string {
  if (!redirect) {
    return "/";
  }

  const trimmed = redirect.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/";
  }

  // Reject backslash tricks or protocol-like prefixes
  if (trimmed.includes("\\") || /^\/[a-zA-Z]+:/.test(trimmed)) {
    return "/";
  }

  return trimmed;
}
