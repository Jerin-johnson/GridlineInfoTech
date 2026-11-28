import axios from "axios";

export interface NestErrorPayload {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

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

/**
 * Converts Axios/NestJS errors into the standard ApiError format.
 */
export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError<NestErrorPayload>(error)) {
    if (!error.response) {
      return new ApiError(
        "Unable to reach the server. Please check your connection and try again.",
        0,
      );
    }

    const payload = error.response.data;
    const rawMessage = payload?.message;
    const details = Array.isArray(rawMessage) ? rawMessage : undefined;

    const message = Array.isArray(rawMessage)
      ? rawMessage[0] || "Request failed"
      : rawMessage || error.response.statusText || "Request failed";

    return new ApiError(message, error.response.status, details);
  }

  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError("An unexpected error occurred.", 0);
}
