import type { ApiResponse } from "@/types/api";
import { clearAuthToken, getAuthToken } from "@/lib/auth/token";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
  token?: string;
  redirectOnUnauthorized?: boolean;
};

export async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<ApiResponse<T>> {
  try {
    const token =
      options?.auth === true ? (options.token ?? getAuthToken()) : null;
    const headers = new Headers(options?.headers);
    const requestBody = options?.body;
    const isFormDataBody =
      typeof FormData !== "undefined" && requestBody instanceof FormData;

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (requestBody && !isFormDataBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers,
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        if (options?.redirectOnUnauthorized && typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }

      const payloadMessage =
        typeof payload === "object" &&
        payload !== null &&
        "message" in payload &&
        typeof payload.message === "string"
          ? payload.message
          : null;

      return {
        data: null,
        error: {
          message: payloadMessage ?? `Request failed: ${response.statusText}`,
          status: response.status,
          code: response.status === 401 ? "UNAUTHORIZED" : "REQUEST_FAILED",
        },
      };
    }

    return { data: payload as T, error: null };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        status: 0,
        code: "NETWORK_ERROR",
      },
    };
  }
}
