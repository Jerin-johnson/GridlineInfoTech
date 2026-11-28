import {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

export function registerRequestInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      config.withCredentials = true;

      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }

      if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        config.headers.delete("Content-Type");
      } else if (
        config.data !== undefined &&
        !config.headers.has("Content-Type")
      ) {
        config.headers.set("Content-Type", "application/json");
      }

      return config;
    },
    (error: AxiosError) => Promise.reject(error),
  );
}
