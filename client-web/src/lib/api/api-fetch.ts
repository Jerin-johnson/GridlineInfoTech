import { AxiosHeaders, type AxiosRequestConfig } from "axios";
import { normalizeApiError } from "./api-error";
import { apiClient } from "./axios-instance";
import type { RetryableAxiosRequestConfig } from "./interceptors/response.interceptor";

/**
 * Safely converts Fetch API HeadersInit into AxiosHeaders without unsafe casts.
 */
function toAxiosHeaders(init?: HeadersInit): AxiosHeaders {
  const headers = new AxiosHeaders();
  if (!init) {
    return headers;
  }

  if (typeof Headers !== "undefined" && init instanceof Headers) {
    init.forEach((value, key) => {
      headers.set(key, value);
    });
    return headers;
  }

  if (Array.isArray(init)) {
    for (const [key, value] of init) {
      headers.set(key, value);
    }
    return headers;
  }

  for (const [key, value] of Object.entries(init)) {
    if (value !== undefined) {
      headers.set(key, value);
    }
  }

  return headers;
}

/**
 * Preserves the existing apiFetch<T>() interface across all services and components.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  hasRetried = false,
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  try {
    const headers = toAxiosHeaders(options.headers);

    const config: AxiosRequestConfig & Partial<Pick<RetryableAxiosRequestConfig, "_hasRetried">> = {
      url: normalizedPath,
      method: options.method ?? "GET",
      headers,
      withCredentials: true,
      ...(hasRetried ? { _hasRetried: true } : {}),
    };

    if (options.body !== undefined && options.body !== null) {
      config.data = options.body;
      if (typeof FormData !== "undefined" && options.body instanceof FormData) {
        headers.delete("Content-Type");
      }
    }

    if (options.signal) {
      config.signal = options.signal;
    }

    const response = await apiClient.request<T>(config);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
