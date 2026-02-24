import { apiFetch } from "@/lib/api/client";
import type { Scrim, Team, User } from "@/types/domain";

export function getCurrentUser() {
  return apiFetch<User>("/api/users/me", {
    auth: true,
    redirectOnUnauthorized: true,
  });
}

export function getTeams() {
  return apiFetch<Team[]>("/api/teams");
}

export function getUpcomingScrims() {
  return apiFetch<Scrim[]>("/api/scrims?upcoming=true");
}
