"use client";

export type RealtimeEvent = {
  type: string;
  message?: string;
  tone?: "success" | "error";
  teamId?: number;
  teamIds?: number[];
  scrim?: {
    id?: number;
    team1Id?: number;
    team2Id?: number;
    scheduledAt?: string;
    status?: string;
  };
};

type RealtimeListener = (event: RealtimeEvent) => void;

const listeners = new Set<RealtimeListener>();

let socket: WebSocket | null = null;
let reconnectTimer: number | null = null;
let reconnectAttempts = 0;
let subscribedTeamIds: number[] = [];

function getRealtimeUrl() {
  return process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000";
}

function emit(event: RealtimeEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}

function sendTeamSubscriptions() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(
    JSON.stringify({
      type: "subscribe",
      teamIds: subscribedTeamIds,
    }),
  );
}

function scheduleReconnect() {
  if (typeof window === "undefined" || listeners.size === 0 || reconnectTimer !== null) {
    return;
  }

  const delayMs = Math.min(1000 * 2 ** reconnectAttempts, 10000);
  reconnectAttempts += 1;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connectRealtime();
  }, delayMs);
}

function connectRealtime() {
  if (typeof window === "undefined") {
    return;
  }

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  socket = new WebSocket(getRealtimeUrl());

  socket.addEventListener("open", () => {
    reconnectAttempts = 0;
    sendTeamSubscriptions();
  });

  socket.addEventListener("message", (event) => {
    const data = String(event.data);
    try {
      emit(JSON.parse(data) as RealtimeEvent);
    } catch {
      emit({ type: "notification", message: data });
    }
  });

  socket.addEventListener("close", () => {
    socket = null;
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    socket?.close();
  });
}

export function setRealtimeTeamSubscriptions(teamIds: number[]) {
  subscribedTeamIds = Array.from(
    new Set(teamIds.filter((teamId) => Number.isInteger(teamId))),
  );
  sendTeamSubscriptions();
}

export function subscribeRealtimeEvents(listener: RealtimeListener) {
  listeners.add(listener);
  connectRealtime();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.close();
      socket = null;
    }
  };
}
