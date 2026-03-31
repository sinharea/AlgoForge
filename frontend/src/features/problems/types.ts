export type Difficulty = "Easy" | "Medium" | "Hard";

export type ProblemStatus = "Solved" | "Unsolved";

export type ProblemCategory = "All Topics" | "Algorithms" | "Database" | "Shell" | "Concurrency";

export type ProblemSort = "acceptance" | "difficulty" | "id" | "title";

export type ProblemFiltersState = {
  difficulty: Difficulty[];
  topics: string[];
  status: ProblemStatus | null;
  company: string[];
  showFavorites: boolean;
};

export type ProblemRecord = {
  id: string;
  problemId: number;
  title: string;
  slug: string;
  difficulty: Difficulty;
  acceptance: number;
  topics: string[];
  companies: string[];
  keywords: string[];
  category: Exclude<ProblemCategory, "All Topics">;
  premium: boolean;
};

export type ProblemViewItem = ProblemRecord & {
  solved: boolean;
  favorite: boolean;
};
