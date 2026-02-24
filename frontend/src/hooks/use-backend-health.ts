"use client";

import { useEffect, useState } from "react";
import { getBackendHealth } from "@/lib/api/health";

type HealthState = {
  status: string | null;
  loading: boolean;
  errorMessage: string | null;
};

export function useBackendHealth(): HealthState {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const response = await getBackendHealth();
      if (!isMounted) {
        return;
      }

      if (response.error) {
        setErrorMessage(
          "Unable to reach backend health endpoint. Check backend container and NEXT_PUBLIC_API_URL.",
        );
        setLoading(false);
        return;
      }

      setStatus(response.data?.status ?? null);
      setLoading(false);
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  return { status, loading, errorMessage };
}
