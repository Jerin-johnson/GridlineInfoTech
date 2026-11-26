const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"
).replace(/\/+$/, "");

export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: string[];

  constructor(message: string, status: number, details?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

interface NestErrorPayload {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  const headers = new Headers(options.headers);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      "Unable to reach the server. Please check your connection and try again.",
      0,
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson
    ? ((await response.json()) as NestErrorPayload & T)
    : null;

  if (!response.ok) {
    const rawMessage = payload?.message;
    const details = Array.isArray(rawMessage) ? rawMessage : undefined;
    const message = Array.isArray(rawMessage)
      ? rawMessage[0] || "Request failed"
      : rawMessage || response.statusText || "Request failed";

    throw new ApiError(message, response.status, details);
  }

  return (payload ?? ({} as T)) as T;
}
