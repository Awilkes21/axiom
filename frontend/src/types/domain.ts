export type User = {
  id: number;
  email: string;
  displayName: string | null;
  bio: string | null;
  timezone: string | null;
  discordHandle: string | null;
};

export type Team = {
  id: number;
  name: string;
  titleId: number;
  visibility: "public" | "private";
};

export type Game = {
  id: number;
  slug: string;
  name: string;
  shortName: string | null;
};

export type TeamMember = {
  accountId: number;
  teamId: number;
  role: "player" | "sub" | "coach" | "manager" | "admin";
};

export type TeamDetails = {
  team: Team;
  members: TeamMember[];
};

export type CalendarScrim = {
  id: number;
  scheduledAt: string;
  opponent: {
    id: number;
    name: string;
  };
  status: string;
};

export type ScrimPost = {
  id: number;
  hostTeamId: number;
  hostTeamName: string;
  titleId: number;
  titleName: string;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  status: "open" | "closed" | "canceled";
  createdByAccountId: number;
  createdAt: string;
};

export type ScrimApplication = {
  id: number;
  scrimPostId: number;
  requestingTeamId: number;
  requestingTeamName: string;
  requestedByAccountId: number;
  message: string | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  createdAt: string;
};
