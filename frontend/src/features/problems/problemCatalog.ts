import { Difficulty, ProblemCategory, ProblemRecord } from "./types";

export type ApiProblem = {
  _id: string;
  questionNumber?: number;
  title: string;
  slug: string;
  difficulty: Difficulty;
  tags?: string[];
  hiddenTestCaseCount?: number;
  submissionCount?: number;
  acceptedCount?: number;
  acceptanceRate?: number;
};

type ProblemSeed = {
  id: number;
  title: string;
  difficulty: Difficulty;
  acceptance: number;
  topics: string[];
  companies: string[];
  solved: boolean;
  favorite: boolean;
  keywords?: string[];
  category?: Exclude<ProblemCategory, "All Topics">;
  premium?: boolean;
  slug?: string;
};

const TAG_ALIASES: Record<string, string> = {
  hashmap: "HashMap",
  "hash map": "HashMap",
  bst: "Tree",
  dfs: "DFS",
  bfs: "BFS",
  dp: "DP",
  sql: "SQL",
};

const TAG_COMPANY_MAP: Record<string, string[]> = {
  Array: ["Google", "Amazon", "Meta"],
  String: ["Amazon", "Microsoft", "Adobe"],
  HashMap: ["Google", "Meta", "Uber"],
  DP: ["Google", "Microsoft", "Apple"],
  Graph: ["Google", "Amazon", "Meta"],
  Tree: ["Amazon", "Microsoft", "Bloomberg"],
  SQL: ["Amazon", "Google", "Snowflake"],
  Shell: ["Apple", "Netflix", "Datadog"],
  Concurrency: ["Microsoft", "Meta", "Uber"],
  Greedy: ["Google", "Amazon", "Adobe"],
  SlidingWindow: ["Meta", "Amazon", "Google"],
};

const FALLBACK_COMPANIES = [
  "Google",
  "Amazon",
  "Microsoft",
  "Meta",
  "Apple",
  "Adobe",
  "Netflix",
  "Uber",
] as const;

const CATEGORY_TAG_MAP: Record<Exclude<ProblemCategory, "All Topics">, string[]> = {
  Algorithms: [
    "Array",
    "String",
    "HashMap",
    "DP",
    "Graph",
    "Tree",
    "Greedy",
    "SlidingWindow",
    "Heap",
    "TwoPointers",
  ],
  Database: ["SQL", "Database"],
  Shell: ["Shell", "Bash"],
  Concurrency: ["Concurrency", "Thread", "Mutex", "Parallel"],
};

export const CATEGORY_TABS: ProblemCategory[] = [
  "All Topics",
  "Algorithms",
  "Database",
  "Shell",
  "Concurrency",
];

export const TRENDING_COMPANIES: Array<{ name: string; mentions: number }> = [
  { name: "Google", mentions: 2242 },
  { name: "Amazon", mentions: 1953 },
  { name: "Microsoft", mentions: 1734 },
  { name: "Meta", mentions: 1461 },
  { name: "Apple", mentions: 1188 },
];

export const sampleProblemData: ProblemSeed[] = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    acceptance: 53.1,
    topics: ["Array", "HashMap"],
    companies: ["Google", "Amazon", "Microsoft"],
    solved: true,
    favorite: false,
    keywords: ["complement", "lookup"],
  },
  {
    id: 2,
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    acceptance: 36.4,
    topics: ["String", "SlidingWindow", "HashMap"],
    companies: ["Amazon", "Microsoft"],
    solved: false,
    favorite: true,
    keywords: ["window", "frequency"],
  },
  {
    id: 3,
    title: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    acceptance: 42.7,
    topics: ["Array", "BinarySearch", "DivideAndConquer"],
    companies: ["Google", "Apple"],
    solved: false,
    favorite: false,
    keywords: ["partition", "ordered"],
    premium: true,
  },
  {
    id: 15,
    title: "3Sum",
    difficulty: "Medium",
    acceptance: 35.6,
    topics: ["Array", "TwoPointers", "Sorting"],
    companies: ["Amazon", "Meta"],
    solved: true,
    favorite: true,
    keywords: ["triplets", "sorting"],
  },
  {
    id: 53,
    title: "Maximum Subarray",
    difficulty: "Medium",
    acceptance: 50.8,
    topics: ["Array", "DP"],
    companies: ["Microsoft", "Amazon"],
    solved: false,
    favorite: false,
    keywords: ["kadane", "contiguous"],
  },
  {
    id: 70,
    title: "Climbing Stairs",
    difficulty: "Easy",
    acceptance: 53.2,
    topics: ["DP", "Math"],
    companies: ["Google", "Adobe"],
    solved: true,
    favorite: false,
  },
  {
    id: 146,
    title: "LRU Cache",
    difficulty: "Medium",
    acceptance: 42.3,
    topics: ["HashMap", "LinkedList", "Design"],
    companies: ["Google", "Amazon", "Meta"],
    solved: false,
    favorite: false,
    premium: true,
  },
  {
    id: 200,
    title: "Number of Islands",
    difficulty: "Medium",
    acceptance: 61.7,
    topics: ["Graph", "BFS", "DFS"],
    companies: ["Amazon", "Google"],
    solved: true,
    favorite: false,
  },
  {
    id: 300,
    title: "Longest Increasing Subsequence",
    difficulty: "Medium",
    acceptance: 55.7,
    topics: ["DP", "BinarySearch"],
    companies: ["Google", "Microsoft"],
    solved: false,
    favorite: false,
  },
  {
    id: 547,
    title: "Number of Provinces",
    difficulty: "Medium",
    acceptance: 68.2,
    topics: ["Graph", "DFS", "UnionFind"],
    companies: ["Microsoft", "Uber"],
    solved: false,
    favorite: false,
  },
  {
    id: 1193,
    title: "Monthly Transactions I",
    difficulty: "Medium",
    acceptance: 64.8,
    topics: ["SQL", "Database"],
    companies: ["Amazon", "Snowflake"],
    solved: false,
    favorite: false,
    category: "Database",
  },
  {
    id: 195,
    title: "Tenth Line",
    difficulty: "Easy",
    acceptance: 38.4,
    topics: ["Shell", "Bash"],
    companies: ["Apple"],
    solved: false,
    favorite: false,
    category: "Shell",
  },
  {
    id: 1114,
    title: "Print in Order",
    difficulty: "Easy",
    acceptance: 73.6,
    topics: ["Concurrency", "Thread"],
    companies: ["Microsoft", "Meta"],
    solved: false,
    favorite: false,
    category: "Concurrency",
    premium: true,
  },
];

export const DEFAULT_TOPIC_TAGS = ["Array", "String", "HashMap", "DP", "Graph"];

const createSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const stableHash = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const normalizeTopic = (rawTopic: string): string => {
  const normalized = rawTopic.trim();
  if (!normalized) {
    return "General";
  }

  const aliasKey = normalized.toLowerCase();
  if (TAG_ALIASES[aliasKey]) {
    return TAG_ALIASES[aliasKey];
  }

  if (normalized.length <= 3) {
    return normalized.toUpperCase();
  }

  return normalized[0].toUpperCase() + normalized.slice(1);
};

const inferCategory = (topics: string[]): Exclude<ProblemCategory, "All Topics"> => {
  const topicSet = new Set(topics);

  if (CATEGORY_TAG_MAP.Database.some((tag) => topicSet.has(tag))) {
    return "Database";
  }

  if (CATEGORY_TAG_MAP.Shell.some((tag) => topicSet.has(tag))) {
    return "Shell";
  }

  if (CATEGORY_TAG_MAP.Concurrency.some((tag) => topicSet.has(tag))) {
    return "Concurrency";
  }

  return "Algorithms";
};

const inferCompanies = (topics: string[], identity: string): string[] => {
  const companies = new Set<string>();

  topics.forEach((topic) => {
    const mapped = TAG_COMPANY_MAP[topic] || [];
    mapped.forEach((company) => companies.add(company));
  });

  if (companies.size === 0) {
    const hash = stableHash(identity);
    companies.add(FALLBACK_COMPANIES[hash % FALLBACK_COMPANIES.length]);
    companies.add(FALLBACK_COMPANIES[(hash + 3) % FALLBACK_COMPANIES.length]);
  }

  return Array.from(companies).slice(0, 4);
};

const inferPremium = (identity: string): boolean => stableHash(identity) % 5 === 0;

const buildKeywords = (title: string, topics: string[], companies: string[]): string[] => {
  const titleTokens = title
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

  return Array.from(
    new Set([
      ...titleTokens,
      ...topics.map((topic) => topic.toLowerCase()),
      ...companies.map((company) => company.toLowerCase()),
    ])
  );
};

const toProblemRecordFromSeed = (seed: ProblemSeed): ProblemRecord => {
  const slug = seed.slug || createSlug(seed.title);
  const topics = seed.topics.map(normalizeTopic);
  const companies = Array.from(new Set(seed.companies));

  return {
    id: String(seed.id),
    problemId: seed.id,
    title: seed.title,
    slug,
    difficulty: seed.difficulty,
    acceptance: seed.acceptance,
    topics,
    companies,
    keywords: seed.keywords || buildKeywords(seed.title, topics, companies),
    category: seed.category || inferCategory(topics),
    premium: Boolean(seed.premium),
  };
};

const toProblemRecordFromApi = (problem: ApiProblem): ProblemRecord => {
  const identity = `${problem._id}:${problem.slug}:${problem.title}`;
  const topics = (problem.tags || []).map(normalizeTopic);
  const companies = inferCompanies(topics, identity);

  // Use API acceptance rate when provided; default missing values to 0.
  const acceptance = typeof problem.acceptanceRate === "number" && Number.isFinite(problem.acceptanceRate)
    ? Number(problem.acceptanceRate.toFixed(1))
    : 0;

  return {
    id: problem._id,
    problemId: problem.questionNumber || stableHash(problem._id) % 5000,
    title: problem.title,
    slug: problem.slug,
    difficulty: problem.difficulty,
    acceptance,
    topics,
    companies,
    keywords: buildKeywords(problem.title, topics, companies),
    category: inferCategory(topics),
    premium: inferPremium(identity),
  };
};

export const getBaseProblemCatalog = (apiProblems: ApiProblem[]): ProblemRecord[] => {
  if (apiProblems.length === 0) {
    return [];
  }

  return apiProblems
    .map(toProblemRecordFromApi)
    .sort((left, right) => left.problemId - right.problemId);
};

export const getDifficultyRank = (difficulty: Difficulty): number => {
  if (difficulty === "Easy") return 0;
  if (difficulty === "Medium") return 1;
  return 2;
};
