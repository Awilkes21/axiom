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
  displayName?: string | null;
  email?: string;
  role: "player" | "sub" | "coach" | "manager" | "admin";
};

export type AccountSearchResult = {
  id: number;
  email: string;
  displayName: string | null;
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
  requestedByTeamId?: number;
};

export type AvailabilitySlot = {
  startsAt: string;
  availableAccountIds: number[];
  availableCount: number;
  memberCount: number;
  allAvailable: boolean;
};

export type TeamAvailability = {
  teamId: number;
  windowStart: string;
  windowEnd: string;
  mine: string[];
  slots: AvailabilitySlot[];
};

export type TeamInvitation = {
  id: number;
  teamId: number;
  teamName: string;
  invitedAccountId: number;
  invitedByAccountId: number;
  role: "player" | "sub" | "coach" | "manager" | "admin";
  status: "pending" | "accepted" | "declined" | "canceled";
  createdAt: string;
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

export type ConversationTeam = Team;

export type Conversation = {
  id: number;
  conversationType: "team" | "player";
  team1: ConversationTeam;
  team2: ConversationTeam;
  otherTeam: ConversationTeam;
  scrimPostId: number | null;
  scrimApplicationId: number | null;
  latestMessage: {
    id: number;
    body: string;
    messageType: ConversationMessage["messageType"];
    senderTeamId: number | null;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationMessage = {
  id: number;
  conversationId: number;
  senderTeamId: number | null;
  senderTeamName: string | null;
  senderAccountId: number | null;
  senderDisplayName: string | null;
  body: string;
  messageType: "message" | "scrim_request" | "scrim_response" | "system";
  metadata: Record<string, unknown>;
  createdAt: string;
};
