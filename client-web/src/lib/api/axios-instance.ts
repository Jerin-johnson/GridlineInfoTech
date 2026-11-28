import axios from "axios";
import { registerRequestInterceptor } from "./interceptors/request.interceptor";
import { registerResponseInterceptor } from "./interceptors/response.interceptor";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
).replace(/\/+$/, "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

registerRequestInterceptor(apiClient);
registerResponseInterceptor(apiClient);
