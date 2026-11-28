import type {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import type { NestErrorPayload } from "../api-error";

const AUTH_NO_REFRESH_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/google",
  "/auth/refresh",
  "/auth/logout",
]);

export interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _hasRetried?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

/**
 * Refresh the authentication session once.
 * Prevents multiple simultaneous refresh requests using a shared promise.
 */
async function refreshSessionOnce(client: AxiosInstance): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = client
      .post("/auth/refresh", {})
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function getNormalizedPath(url?: string): string {
  const pathOnly = (url ?? "").split("?")[0];
  return pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
}

/**
 * Automatically refreshes the session when an authenticated request
 * returns 401, then retries the original request once.
 */
export function registerResponseInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<NestErrorPayload>) => {
      const originalRequest = error.config as
        | RetryableAxiosRequestConfig
        | undefined;

      if (!originalRequest) {
        return Promise.reject(error);
      }

      const normalizedPath = getNormalizedPath(originalRequest.url);

      const shouldRefresh =
        error.response?.status === 401 &&
        !originalRequest._hasRetried &&
        typeof window !== "undefined" &&
        !AUTH_NO_REFRESH_PATHS.has(normalizedPath);

      if (!shouldRefresh) {
        return Promise.reject(error);
      }

      originalRequest._hasRetried = true;

      const refreshed = await refreshSessionOnce(client);
      if (refreshed) {
        return client(originalRequest);
      }

      return Promise.reject(error);
    },
  );
}
