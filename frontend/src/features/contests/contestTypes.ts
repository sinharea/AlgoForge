export type ContestStatus = "upcoming" | "live" | "past";

export type ContestProblem = {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
};

export type ContestParticipant = {
  userId: string;
  joinedAt?: string;
};

export type LeaderboardEntry = {
  userId: string;
  name: string;
  score: number;
  solved?: number;
  penalty: number;
};

export type ContestListItem = {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  problems: ContestProblem[];
  participants: ContestParticipant[];
  status: ContestStatus;
};
