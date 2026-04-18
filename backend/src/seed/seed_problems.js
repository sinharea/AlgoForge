require("dotenv").config();
const mongoose = require("mongoose");
const connectDb = require("../config/db");
const Problem = require("../models/Problem");
const User = require("../models/User");

const SEED_SLUGS = [
  "meeting-rooms-ii",
  "shortest-path-binary-matrix",
  "lru-cache",
  "word-break",
  "median-of-two-sorted-arrays",
];

const mapDifficultyScore = (difficulty) => {
  if (difficulty === "Easy") return 3;
  if (difficulty === "Medium") return 6;
  return 9;
};

const pickSamples = (testCases) => testCases.slice(0, 3);

const buildProblemDocs = (creatorId) => {
  const docs = [
    {
      title: "Meeting Rooms II",
      slug: "meeting-rooms-ii",
      difficulty: "Medium",
      description:
        "Given an array of meeting time intervals where intervals[i] = [start_i, end_i], return the minimum number of conference rooms required so that all meetings can be held without conflicts.",
      constraints:
        "1 <= intervals.length <= 10^5\n0 <= start_i < end_i <= 10^6\nIntervals are not guaranteed to be sorted.",
      editorialApproach:
        "Sort starts and ends separately. Sweep through both arrays using two pointers. If next start < next end, allocate a room; otherwise free one room.",
      editorialSolution:
        "Two-pointer sweep over sorted start[] and end[] arrays in O(n log n).",
      optimalComplexity: {
        time: "O(n log n)",
        space: "O(n)",
        notes: "Sorting dominates runtime.",
      },
      tags: ["Array", "Sorting", "Two Pointers", "Heap"],
      companyTags: ["Google", "Amazon", "Meta", "Microsoft"],
      hints: [
        { level: 1, type: "approach", content: "Try to reason about room usage over time rather than pairing intervals greedily." },
        { level: 2, type: "algorithm", content: "Sort all start times and end times independently and sweep with two pointers." },
        { level: 3, type: "edge_case", content: "When start == end, a room can be reused immediately." },
      ],
      inputFormat:
        "First line: integer n. Next n lines: two integers start and end for each meeting interval.",
      outputFormat: "Single integer: minimum number of rooms required.",
      timeLimit: 2000,
      memoryLimit: 128,
      sampleTestCases: [
        { input: "3\n0 30\n5 10\n15 20", expectedOutput: "2" },
        { input: "3\n7 10\n2 4\n11 13", expectedOutput: "1" },
        { input: "4\n1 2\n2 3\n3 4\n4 5", expectedOutput: "1" },
      ],
      testCases: [
        { input: "3\n0 30\n5 10\n15 20", expectedOutput: "2" },
        { input: "3\n7 10\n2 4\n11 13", expectedOutput: "1" },
        { input: "5\n1 5\n2 6\n4 8\n9 12\n10 11", expectedOutput: "3" },
        { input: "4\n1 2\n2 3\n3 4\n4 5", expectedOutput: "1" },
        { input: "6\n1 10\n2 7\n3 19\n8 12\n10 20\n11 30", expectedOutput: "4" },
      ],
    },
    {
      title: "Shortest Path in Binary Matrix",
      slug: "shortest-path-binary-matrix",
      difficulty: "Medium",
      description:
        "Given an n x n binary matrix grid, return the length of the shortest clear path from top-left to bottom-right. A clear path may move in 8 directions and must pass only through cells with value 0.",
      constraints:
        "1 <= n <= 200\ngrid[i][j] is 0 or 1",
      editorialApproach:
        "Use BFS from (0,0). Each layer corresponds to path length. Visit each cell once.",
      editorialSolution: "Standard 8-direction BFS with distance tracking.",
      optimalComplexity: {
        time: "O(n^2)",
        space: "O(n^2)",
        notes: "Every cell is enqueued at most once.",
      },
      tags: ["Graph", "BFS", "Matrix", "Shortest Path"],
      companyTags: ["Amazon", "Google", "Bloomberg"],
      hints: [
        { level: 1, type: "approach", content: "Think in unweighted graph terms: shortest path suggests BFS." },
        { level: 2, type: "algorithm", content: "Track (row, col, distance) in queue and expand 8 neighbors." },
        { level: 3, type: "edge_case", content: "If start or end is blocked, answer is -1 immediately." },
      ],
      inputFormat:
        "First line: n. Next n lines: n binary integers (0/1) representing the grid.",
      outputFormat: "Single integer: shortest path length, or -1 if impossible.",
      timeLimit: 2000,
      memoryLimit: 128,
      sampleTestCases: [
        { input: "2\n0 1\n1 0", expectedOutput: "2" },
        { input: "3\n0 0 0\n1 1 0\n1 1 0", expectedOutput: "4" },
        { input: "3\n1 0 0\n1 1 0\n1 1 0", expectedOutput: "-1" },
      ],
      testCases: [
        { input: "2\n0 1\n1 0", expectedOutput: "2" },
        { input: "3\n0 0 0\n1 1 0\n1 1 0", expectedOutput: "4" },
        { input: "3\n1 0 0\n1 1 0\n1 1 0", expectedOutput: "-1" },
        { input: "1\n0", expectedOutput: "1" },
        { input: "4\n0 1 1 1\n0 0 1 1\n1 0 0 1\n1 1 0 0", expectedOutput: "5" },
      ],
    },
    {
      title: "LRU Cache",
      slug: "lru-cache",
      difficulty: "Medium",
      description:
        "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache with get(key) and put(key, value) in average O(1) time.",
      constraints:
        "1 <= capacity <= 3000\n0 <= key, value <= 10^5\nUp to 2*10^5 operations",
      editorialApproach:
        "Combine a hash map for O(1) key lookup with a doubly linked list for O(1) recency updates and eviction.",
      editorialSolution:
        "Map key->node and maintain a head/tail linked list where head is most recent and tail is least recent.",
      optimalComplexity: {
        time: "O(1) average per operation",
        space: "O(capacity)",
        notes: "Constant-time updates rely on node references from hash map.",
      },
      tags: ["Design", "HashMap", "Linked List"],
      companyTags: ["Google", "Amazon", "Microsoft", "Meta", "Adobe"],
      hints: [
        { level: 1, type: "approach", content: "You need both fast lookup and fast ordering updates." },
        { level: 2, type: "algorithm", content: "Hash map + doubly linked list is the classic pattern for LRU." },
        { level: 3, type: "code", content: "On get/put hit, move node to front. On overflow, evict tail node." },
      ],
      inputFormat:
        "Line 1: capacity c. Line 2: q operations. Next q lines: GET key or PUT key value.",
      outputFormat:
        "For each GET operation output the value, or -1 if absent, each on a new line.",
      timeLimit: 2500,
      memoryLimit: 256,
      sampleTestCases: [
        {
          input: "2\n6\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nGET 3",
          expectedOutput: "1\n-1\n3",
        },
        {
          input: "1\n5\nPUT 2 1\nGET 2\nPUT 3 2\nGET 2\nGET 3",
          expectedOutput: "1\n-1\n2",
        },
      ],
      testCases: [
        {
          input: "2\n6\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nGET 3",
          expectedOutput: "1\n-1\n3",
        },
        {
          input: "1\n5\nPUT 2 1\nGET 2\nPUT 3 2\nGET 2\nGET 3",
          expectedOutput: "1\n-1\n2",
        },
        {
          input: "2\n8\nPUT 1 1\nPUT 2 2\nPUT 1 5\nGET 1\nPUT 3 3\nGET 2\nGET 3\nGET 1",
          expectedOutput: "5\n-1\n3\n5",
        },
        {
          input: "3\n7\nPUT 1 10\nPUT 2 20\nPUT 3 30\nGET 1\nPUT 4 40\nGET 2\nGET 4",
          expectedOutput: "10\n-1\n40",
        },
      ],
    },
    {
      title: "Word Break",
      slug: "word-break",
      difficulty: "Medium",
      description:
        "Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.",
      constraints:
        "1 <= s.length <= 300\n1 <= wordDict.length <= 1000\n1 <= wordDict[i].length <= 20",
      editorialApproach:
        "Use DP where dp[i] indicates whether prefix s[0..i) can be segmented.",
      editorialSolution:
        "For each i, check any j < i where dp[j] is true and s[j..i) exists in dictionary.",
      optimalComplexity: {
        time: "O(n^2)",
        space: "O(n)",
        notes: "Using set lookup keeps dictionary checks O(1) average.",
      },
      tags: ["Dynamic Programming", "String", "Trie"],
      companyTags: ["Amazon", "Google", "Apple", "Uber"],
      hints: [
        { level: 1, type: "approach", content: "Try to determine if each prefix is constructible from dictionary words." },
        { level: 2, type: "algorithm", content: "Let dp[0]=true and build up dp[i] using earlier true states." },
        { level: 3, type: "edge_case", content: "A long string with repeated characters can cause many splits; prune using max word length." },
      ],
      inputFormat:
        "Line 1: string s. Line 2: integer m. Next m lines: dictionary words.",
      outputFormat: "Print true or false.",
      timeLimit: 2000,
      memoryLimit: 128,
      sampleTestCases: [
        { input: "leetcode\n2\nleet\ncode", expectedOutput: "true" },
        { input: "applepenapple\n2\napple\npen", expectedOutput: "true" },
        { input: "catsandog\n5\ncats\ndog\nsand\nand\ncat", expectedOutput: "false" },
      ],
      testCases: [
        { input: "leetcode\n2\nleet\ncode", expectedOutput: "true" },
        { input: "applepenapple\n2\napple\npen", expectedOutput: "true" },
        { input: "catsandog\n5\ncats\ndog\nsand\nand\ncat", expectedOutput: "false" },
        { input: "aaaaaaa\n2\naaa\naaaa", expectedOutput: "true" },
        { input: "cars\n3\ncar\nca\nrs", expectedOutput: "true" },
      ],
    },
    {
      title: "Median of Two Sorted Arrays",
      slug: "median-of-two-sorted-arrays",
      difficulty: "Hard",
      description:
        "Given two sorted arrays nums1 and nums2 of sizes m and n, return the median of the two sorted arrays in O(log(m+n)) time.",
      constraints:
        "0 <= m, n <= 10^5\n1 <= m + n <= 2*10^5\n-10^6 <= nums[i] <= 10^6",
      editorialApproach:
        "Binary search partition on smaller array so left partitions contain half of total elements.",
      editorialSolution:
        "Find partition i/j such that maxLeftA <= minRightB and maxLeftB <= minRightA; derive median from border values.",
      optimalComplexity: {
        time: "O(log(min(m,n)))",
        space: "O(1)",
        notes: "Partition method avoids merge.",
      },
      tags: ["Array", "Binary Search", "Divide and Conquer"],
      companyTags: ["Google", "Microsoft", "Adobe", "Goldman Sachs"],
      hints: [
        { level: 1, type: "approach", content: "Think about where the median sits if arrays were merged, without actually merging." },
        { level: 2, type: "algorithm", content: "Binary-search the cut position in the smaller array." },
        { level: 3, type: "edge_case", content: "Carefully handle empty sides with +/-Infinity sentinels." },
      ],
      inputFormat:
        "Line 1: m then m sorted integers. Line 2: n then n sorted integers.",
      outputFormat: "Print median as a decimal if needed.",
      timeLimit: 2500,
      memoryLimit: 128,
      sampleTestCases: [
        { input: "2\n1 3\n1\n2", expectedOutput: "2" },
        { input: "2\n1 2\n2\n3 4", expectedOutput: "2.5" },
        { input: "0\n\n1\n1", expectedOutput: "1" },
      ],
      testCases: [
        { input: "2\n1 3\n1\n2", expectedOutput: "2" },
        { input: "2\n1 2\n2\n3 4", expectedOutput: "2.5" },
        { input: "0\n\n1\n1", expectedOutput: "1" },
        { input: "3\n0 0 0\n3\n0 0 0", expectedOutput: "0" },
        { input: "1\n1000000\n1\n-1000000", expectedOutput: "0" },
      ],
    },
  ];

  return docs.map((problem, index) => {
    const testCases = problem.testCases || [];
    const sampleTestCases = (problem.sampleTestCases && problem.sampleTestCases.length > 0)
      ? problem.sampleTestCases
      : pickSamples(testCases);
    return {
      ...problem,
      questionNumber: 900 + index + 1,
      sampleTestCases,
      hiddenTestCaseCount: testCases.length,
      isPublished: true,
      difficultyScore: mapDifficultyScore(problem.difficulty),
      createdBy: creatorId,
    };
  });
};

const run = async () => {
  await connectDb();

  let admin = await User.findOne({ role: "admin" }).select("_id").lean();

  if (!admin?._id) {
    const fallbackEmail = process.env.SEED_ADMIN_EMAIL || "seed-admin@algoforge.dev";
    const fallbackPassword = process.env.SEED_ADMIN_PASSWORD || "Password123!";

    const createdAdmin = await User.create({
      name: "Seed Admin",
      email: fallbackEmail,
      password: fallbackPassword,
      role: "admin",
      isEmailVerified: true,
    });

    admin = { _id: createdAdmin._id };
    console.log(`Created fallback admin user: ${fallbackEmail}`);
  }

  await Problem.deleteMany({ slug: { $in: SEED_SLUGS } });

  const docs = buildProblemDocs(admin._id);
  await Problem.insertMany(docs);

  console.log(`Seeded ${docs.length} detailed problems.`);

  await mongoose.disconnect();
};

run()
  .then(() => {
    console.log("seed_problems completed successfully");
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("seed_problems failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
