"use client";

import { useEffect } from "react";
import { getMyTeamsForRealtime } from "@/lib/api/endpoints";
import { getAuthToken } from "@/lib/auth/token";
import { setRealtimeTeamSubscriptions } from "@/lib/realtime/events";

export function useRealtimeTeamSubscriptions() {
  useEffect(() => {
    let active = true;

    async function loadSubscriptions() {
      const token = getAuthToken();
      if (!token) {
        setRealtimeTeamSubscriptions([]);
        return;
      }

      const response = await getMyTeamsForRealtime();
      if (!active) {
        return;
      }

      if (response.error) {
        setRealtimeTeamSubscriptions([]);
        return;
      }

      setRealtimeTeamSubscriptions((response.data?.teams ?? []).map((team) => team.id));
    }

    void loadSubscriptions();

    return () => {
      active = false;
    };
  }, []);
}
