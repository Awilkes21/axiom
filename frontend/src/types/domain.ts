export type User = {
  id: number;
  username: string;
  email: string;
};

export type Team = {
  id: number;
  name: string;
};

export type Scrim = {
  id: number;
  team1Id: number;
  team2Id: number;
  startsAt: string;
  status: string;
};
