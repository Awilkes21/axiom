import { apiFetch } from "@/lib/api/client";

type HealthResponse = {
  status: string;
};

export function getBackendHealth() {
  return apiFetch<HealthResponse>("/health");
}
