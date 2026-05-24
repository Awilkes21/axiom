"use client";

import { useState } from "react";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";

export function useRealtimeNotifications() {
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");

  useRealtimeEvents((event) => {
    if (!event.message) {
      return;
    }

    setMessage(event.message);
    setTone(event.tone === "error" ? "error" : "success");
  });

  return {
    message,
    tone,
    clear: () => setMessage(null),
  };
}
