"use client";

import { io, type Socket } from "socket.io-client";

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
  conversationId?: number;
};

type RealtimeListener = (event: RealtimeEvent) => void;

const listeners = new Set<RealtimeListener>();

let socket: Socket | null = null;
let subscribedTeamIds: number[] = [];

function getSocketConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000";
  const url = new URL(rawUrl);
  const protocol =
    url.protocol === "wss:" ? "https:" : url.protocol === "ws:" ? "http:" : url.protocol;
  const normalizedPath = url.pathname.replace(/\/$/, "");

  return {
    baseUrl: `${protocol}//${url.host}`,
    path: normalizedPath ? `${normalizedPath}/socket.io` : "/socket.io",
  };
}

function emit(event: RealtimeEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}

function sendTeamSubscriptions() {
  if (!socket?.connected) {
    return;
  }

  socket.emit("subscribe", {
    teamIds: subscribedTeamIds,
  });
}

function connectRealtime() {
  if (typeof window === "undefined" || socket) {
    return;
  }

  const { baseUrl, path } = getSocketConfig();
  socket = io(baseUrl, {
    path,
    transports: ["websocket"],
  });

  socket.on("connect", sendTeamSubscriptions);
  socket.on("realtime:event", (event: RealtimeEvent) => emit(event));
  socket.on("message", (message) => {
    emit({ type: "notification", message: String(message) });
  });
  socket.on("connect_error", () => {
    emit({
      type: "notification",
      tone: "error",
      message: "Realtime connection unavailable.",
    });
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
      socket?.disconnect();
      socket = null;
    }
  };
}
