import { apiFetch } from "@/lib/api/client";
import type {
  CalendarScrim,
  Game,
  ScrimApplication,
  ScrimPost,
  Team,
  TeamDetails,
  User,
} from "@/types/domain";

export function loginUser(email: string, password: string) {
  return apiFetch<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function signupUser(email: string, password: string, displayName?: string) {
  return apiFetch<{ token: string; user: User }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName: displayName?.trim() || null }),
  });
}

export function getCurrentUser() {
  return apiFetch<{ user: User }>("/profile", {
    auth: true,
    redirectOnUnauthorized: true,
  });
}

export function getTeamDetails(teamId: number) {
  return apiFetch<TeamDetails>(`/teams/${teamId}`, {
    auth: true,
    redirectOnUnauthorized: true,
  });
}

export function getMyTeams() {
  return apiFetch<{ teams: Team[] }>("/teams", {
    auth: true,
    redirectOnUnauthorized: true,
  });
}

export function createTeam(name: string, titleId: number, visibility: "public" | "private") {
  return apiFetch<{ team: Team }>("/teams", {
    method: "POST",
    auth: true,
    redirectOnUnauthorized: true,
    body: JSON.stringify({ name, titleId, visibility }),
  });
}

export function getGames() {
  return apiFetch<{ games: Game[] }>("/games");
}

export function searchPublicTeams(query: string) {
  const encoded = encodeURIComponent(query);
  return apiFetch<{ teams: Team[] }>(`/teams/search?q=${encoded}`, {
    auth: true,
    redirectOnUnauthorized: true,
  });
}

export function getUpcomingScrims(teamId: number) {
  return apiFetch<{ teamId: number; upcoming: boolean; scrims: CalendarScrim[] }>(
    `/teams/${teamId}/scrims?upcoming=true`,
    {
      auth: true,
      redirectOnUnauthorized: true,
    },
  );
}

export function createScrimPost(hostTeamId: number, startsAt: string, endsAt: string, notes?: string) {
  return apiFetch<{ post: ScrimPost }>("/scrim-posts", {
    method: "POST",
    auth: true,
    redirectOnUnauthorized: true,
    body: JSON.stringify({ hostTeamId, startsAt, endsAt, notes }),
  });
}

export function listScrimPosts(filters?: {
  status?: "open" | "closed" | "canceled";
  titleId?: number;
  hostTeamId?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status) {
    params.set("status", filters.status);
  }
  if (filters?.titleId !== undefined) {
    params.set("titleId", String(filters.titleId));
  }
  if (filters?.hostTeamId !== undefined) {
    params.set("hostTeamId", String(filters.hostTeamId));
  }

  const query = params.toString();
  return apiFetch<{ posts: ScrimPost[] }>(`/scrim-posts${query ? `?${query}` : ""}`, {
    auth: true,
    redirectOnUnauthorized: true,
  });
}

export function applyToScrimPost(postId: number, requestingTeamId: number, message?: string) {
  return apiFetch<{ application: ScrimApplication }>(`/scrim-posts/${postId}/applications`, {
    method: "POST",
    auth: true,
    redirectOnUnauthorized: true,
    body: JSON.stringify({ requestingTeamId, message }),
  });
}

export function listScrimPostApplications(postId: number) {
  return apiFetch<{ applications: ScrimApplication[] }>(`/scrim-posts/${postId}/applications`, {
    auth: true,
    redirectOnUnauthorized: true,
  });
}

export function decideScrimApplication(applicationId: number, decision: "accepted" | "rejected") {
  return apiFetch<{ application: ScrimApplication }>(`/scrim-applications/${applicationId}/decision`, {
    method: "PATCH",
    auth: true,
    redirectOnUnauthorized: true,
    body: JSON.stringify({ decision }),
  });
}
