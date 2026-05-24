"use client";

import { useEffect, useRef } from "react";
import { subscribeRealtimeEvents, type RealtimeEvent } from "@/lib/realtime/events";

export function useRealtimeEvents(onEvent: (event: RealtimeEvent) => void) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(
    () =>
      subscribeRealtimeEvents((event) => {
        onEventRef.current(event);
      }),
    [],
  );
}
