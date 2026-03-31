export type DifficultyKey = "Easy" | "Medium" | "Hard";

export type RecommendedProblem = {
  id: string;
  title: string;
  slug: string;
  difficulty: DifficultyKey;
  tags: string[];
  bookmarked?: boolean;
};

export type ActivityItem = {
  id: string;
  title: string;
  solvedAt: string;
};

export type Achievement = {
  id: string;
  title: string;
  detail: string;
  earned: boolean;
};

export type DashboardMockData = {
  userName: string;
  totalSolved: number;
  totalProblems: number;
  streakDays: number;
  byDifficulty: Record<DifficultyKey, number>;
  byTopic: Record<string, number>;
  recommendations: RecommendedProblem[];
  recentActivity: ActivityItem[];
  achievements: Achievement[];
};

export const dashboardMock: DashboardMockData = {
  userName: "Coder",
  totalSolved: 183,
  totalProblems: 500,
  streakDays: 14,
  byDifficulty: {
    Easy: 88,
    Medium: 71,
    Hard: 24,
  },
  byTopic: {
    Array: 52,
    "Two Pointers": 31,
    "Dynamic Programming": 27,
    Graph: 19,
    Tree: 23,
    Greedy: 17,
    Stack: 14,
    BinarySearch: 12,
  },
  recommendations: [
    {
      id: "p1",
      title: "Longest Consecutive Sequence",
      slug: "longest-consecutive-sequence",
      difficulty: "Medium",
      tags: ["Array", "Hashing"],
      bookmarked: true,
    },
    {
      id: "p2",
      title: "LRU Cache",
      slug: "lru-cache",
      difficulty: "Hard",
      tags: ["Design", "Linked List"],
    },
    {
      id: "p3",
      title: "Subarray Sum Equals K",
      slug: "subarray-sum-equals-k",
      difficulty: "Medium",
      tags: ["Prefix Sum", "Hash Map"],
    },
    {
      id: "p4",
      title: "Valid Parentheses",
      slug: "valid-parentheses",
      difficulty: "Easy",
      tags: ["Stack", "String"],
    },
    {
      id: "p5",
      title: "Course Schedule",
      slug: "course-schedule",
      difficulty: "Medium",
      tags: ["Graph", "Topological Sort"],
    },
    {
      id: "p6",
      title: "Trapping Rain Water",
      slug: "trapping-rain-water",
      difficulty: "Hard",
      tags: ["Two Pointers", "Array"],
    },
  ],
  recentActivity: [
    { id: "a1", title: "Two Sum", solvedAt: "2026-03-31T08:14:00.000Z" },
    { id: "a2", title: "Binary Tree Inorder Traversal", solvedAt: "2026-03-30T17:20:00.000Z" },
    { id: "a3", title: "Search in Rotated Sorted Array", solvedAt: "2026-03-29T11:06:00.000Z" },
    { id: "a4", title: "Merge Intervals", solvedAt: "2026-03-28T19:52:00.000Z" },
    { id: "a5", title: "Longest Substring Without Repeating Characters", solvedAt: "2026-03-28T09:25:00.000Z" },
  ],
  achievements: [
    { id: "g1", title: "First Problem Solved", detail: "Complete your first accepted submission", earned: true },
    { id: "g2", title: "10 Easy Done", detail: "Solve 10 Easy problems", earned: true },
    { id: "g3", title: "7-Day Streak", detail: "Solve at least one problem for 7 days", earned: true },
    { id: "g4", title: "Hard Hunter", detail: "Solve 25 Hard problems", earned: false },
  ],
};
