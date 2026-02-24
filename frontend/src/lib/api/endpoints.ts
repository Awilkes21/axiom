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

export function updateCurrentUser(payload: {
  email?: string;
  displayName?: string;
  bio?: string;
  timezone?: string;
  discordHandle?: string;
  password?: string;
}) {
  return apiFetch<{ user: User }>("/profile", {
    method: "PATCH",
    auth: true,
    redirectOnUnauthorized: true,
    body: JSON.stringify(payload),
  });
}

export function getTeamDetails(teamId: number) {
  return apiFetch<TeamDetails>(`/teams/${teamId}`, {
    auth: true,
    redirectOnUnauthorized: true,
  });
}

export function updateTeam(
  teamId: number,
  payload: { name?: string; visibility?: "public" | "private"; titleId?: number },
) {
  return apiFetch<{ team: Team }>(`/teams/${teamId}`, {
    method: "PATCH",
    auth: true,
    redirectOnUnauthorized: true,
    body: JSON.stringify(payload),
  });
}

export function addTeamMember(
  teamId: number,
  accountId: number,
  role: "player" | "sub" | "coach" | "manager" | "admin",
) {
  return apiFetch<{ membership: { accountId: number; teamId: number; role: string } }>(
    `/teams/${teamId}/members`,
    {
      method: "POST",
      auth: true,
      redirectOnUnauthorized: true,
      body: JSON.stringify({ accountId, role }),
    },
  );
}

export function updateTeamMemberRole(
  teamId: number,
  accountId: number,
  role: "player" | "sub" | "coach" | "manager" | "admin",
) {
  return apiFetch<{ membership: { accountId: number; teamId: number; role: string } }>(
    `/teams/${teamId}/members/${accountId}/role`,
    {
      method: "PATCH",
      auth: true,
      redirectOnUnauthorized: true,
      body: JSON.stringify({ role }),
    },
  );
}

export function removeTeamMember(teamId: number, accountId: number) {
  return apiFetch<{ message: string }>(`/teams/${teamId}/members/${accountId}`, {
    method: "DELETE",
    auth: true,
    redirectOnUnauthorized: true,
  });
}

export function leaveTeam(teamId: number) {
  return apiFetch<{ message: string }>(`/teams/${teamId}/leave`, {
    method: "POST",
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

export function createScrim(team1Id: number, team2Id: number, scheduledAt: string) {
  return apiFetch<{
    scrim: { id: number; team1Id: number; team2Id: number; scheduledAt: string; status: string };
  }>("/scrims", {
    method: "POST",
    auth: true,
    redirectOnUnauthorized: true,
    body: JSON.stringify({ team1Id, team2Id, scheduledAt }),
  });
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
