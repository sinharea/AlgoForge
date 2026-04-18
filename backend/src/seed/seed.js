require("dotenv").config();
const mongoose = require("mongoose");
const connectDb = require("../config/db");
const User = require("../models/User");
const Problem = require("../models/Problem");
const Submission = require("../models/Submission");
const Contest = require("../models/Contest");
const UserTopicStats = require("../models/UserTopicStats");
const ContestSubmission = require("../models/ContestSubmission");
const ProblemStats = require("../models/ProblemStats");
const UserProblemStatus = require("../models/UserProblemStatus");
const DailyActivity = require("../models/DailyActivity");
const { USER_ROLES } = require("../constants");

const usersData = [
  { name: "Admin User", email: "admin@algoforge.dev", password: "Password123!", role: USER_ROLES.ADMIN, isEmailVerified: true },
  { name: "Alice", email: "alice@algoforge.dev", password: "Password123!", role: USER_ROLES.USER, isEmailVerified: true },
  { name: "Bob", email: "bob@algoforge.dev", password: "Password123!", role: USER_ROLES.USER, isEmailVerified: true },
];

const problemsData = [
  {
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "Easy",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    tags: ["Array", "HashMap"],
    testCases: [
      { input: "4\n2 7 11 15\n9", expectedOutput: "0 1" },
      { input: "3\n3 2 4\n6", expectedOutput: "1 2" },
      { input: "2\n3 3\n6", expectedOutput: "0 1" }
    ],
    sampleTestCases: [{ input: "4\n2 7 11 15\n9", expectedOutput: "0 1" }],
  },
  {
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    difficulty: "Easy",
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    tags: ["Stack", "String"],
    testCases: [
      { input: "()[]{}", expectedOutput: "true" },
      { input: "(]", expectedOutput: "false" },
      { input: "([)]", expectedOutput: "false" }
    ],
    sampleTestCases: [{ input: "()[]{}", expectedOutput: "true" }],
  },
  {
    title: "Reverse Linked List",
    slug: "reverse-linked-list",
    difficulty: "Easy",
    description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
    tags: ["Linked List", "Recursion"],
    testCases: [
      { input: "5\n1 2 3 4 5", expectedOutput: "5 4 3 2 1" },
      { input: "2\n1 2", expectedOutput: "2 1" },
      { input: "0", expectedOutput: "" }
    ],
    sampleTestCases: [{ input: "5\n1 2 3 4 5", expectedOutput: "5 4 3 2 1" }],
  },
  {
    title: "Maximum Subarray",
    slug: "maximum-subarray",
    difficulty: "Easy",
    description: "Given an integer array nums, find the subarray with the largest sum, and return its sum.",
    tags: ["Array", "Dynamic Programming", "Divide and Conquer"],
    testCases: [
      { input: "9\n-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6" },
      { input: "1\n1", expectedOutput: "1" },
      { input: "5\n5 4 -1 7 8", expectedOutput: "23" }
    ],
    sampleTestCases: [{ input: "9\n-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6" }],
  },
  {
    title: "Binary Tree Inorder Traversal",
    slug: "binary-tree-inorder-traversal",
    difficulty: "Easy",
    description: "Given the root of a binary tree, return the inorder traversal of its nodes' values.",
    tags: ["Tree", "Stack", "Depth-First Search"],
    testCases: [
      { input: "3\n1 -1 2 3", expectedOutput: "1 3 2" },
      { input: "0", expectedOutput: "" },
      { input: "1\n1", expectedOutput: "1" }
    ],
    sampleTestCases: [{ input: "3\n1 -1 2 3", expectedOutput: "1 3 2" }],
  },
  {
    title: "Longest Substring Without Repeating Characters",
    slug: "longest-substring-without-repeating-characters",
    difficulty: "Medium",
    description: "Given a string s, find the length of the longest substring without repeating characters.",
    tags: ["String", "Sliding Window", "HashMap"],
    testCases: [
      { input: "abcabcbb", expectedOutput: "3" },
      { input: "bbbbb", expectedOutput: "1" },
      { input: "pwwkew", expectedOutput: "3" }
    ],
    sampleTestCases: [{ input: "abcabcbb", expectedOutput: "3" }],
  },
  {
    title: "Add Two Numbers",
    slug: "add-two-numbers",
    difficulty: "Medium",
    description: "You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.",
    tags: ["Linked List", "Math", "Recursion"],
    testCases: [
      { input: "3\n2 4 3\n3\n5 6 4", expectedOutput: "7 0 8" },
      { input: "1\n0\n1\n0", expectedOutput: "0" },
      { input: "7\n9 9 9 9 9 9 9\n4\n9 9 9 9", expectedOutput: "8 9 9 9 0 0 0 1" }
    ],
    sampleTestCases: [{ input: "3\n2 4 3\n3\n5 6 4", expectedOutput: "7 0 8" }],
  },
  {
    title: "Longest Palindromic Substring",
    slug: "longest-palindromic-substring",
    difficulty: "Medium",
    description: "Given a string s, return the longest palindromic substring in s.",
    tags: ["String", "Dynamic Programming"],
    testCases: [
      { input: "babad", expectedOutput: "bab" },
      { input: "cbbd", expectedOutput: "bb" },
      { input: "a", expectedOutput: "a" }
    ],
    sampleTestCases: [{ input: "babad", expectedOutput: "bab" }],
  },
  {
    title: "Container With Most Water",
    slug: "container-with-most-water",
    difficulty: "Medium",
    description: "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.",
    tags: ["Array", "Two Pointers", "Greedy"],
    testCases: [
      { input: "9\n1 8 6 2 5 4 8 3 7", expectedOutput: "49" },
      { input: "2\n1 1", expectedOutput: "1" },
      { input: "9\n1 2 4 3 5 6 7 8 9", expectedOutput: "36" }
    ],
    sampleTestCases: [{ input: "9\n1 8 6 2 5 4 8 3 7", expectedOutput: "49" }],
  },
  {
    title: "3Sum",
    slug: "3sum",
    difficulty: "Medium",
    description: "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.\n\nNotice that the solution set must not contain duplicate triplets.",
    tags: ["Array", "Two Pointers", "Sorting"],
    testCases: [
      { input: "6\n-1 0 1 2 -1 -4", expectedOutput: "-1 -1 2\n-1 0 1" },
      { input: "3\n0 1 1", expectedOutput: "" },
      { input: "3\n0 0 0", expectedOutput: "0 0 0" }
    ],
    sampleTestCases: [{ input: "6\n-1 0 1 2 -1 -4", expectedOutput: "-1 -1 2\n-1 0 1" }],
  },
  {
    title: "Merge Intervals",
    slug: "merge-intervals",
    difficulty: "Medium",
    description: "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.",
    tags: ["Array", "Sorting"],
    testCases: [
      { input: "4\n1 3\n2 6\n8 10\n15 18", expectedOutput: "1 6\n8 10\n15 18" },
      { input: "2\n1 4\n4 5", expectedOutput: "1 5" }
    ],
    sampleTestCases: [{ input: "4\n1 3\n2 6\n8 10\n15 18", expectedOutput: "1 6\n8 10\n15 18" }],
  },
  {
    title: "Search in Rotated Sorted Array",
    slug: "search-in-rotated-sorted-array",
    difficulty: "Medium",
    description: "There is an integer array nums sorted in ascending order (with distinct values). Prior to being passed to your function, nums is possibly rotated at an unknown pivot index.\n\nGiven the array nums after the possible rotation and an integer target, return the index of target if it is in nums, or -1 if it is not in nums.",
    tags: ["Array", "Binary Search"],
    testCases: [
      { input: "7\n4 5 6 7 0 1 2\n0", expectedOutput: "4" },
      { input: "7\n4 5 6 7 0 1 2\n3", expectedOutput: "-1" },
      { input: "1\n1\n0", expectedOutput: "-1" }
    ],
    sampleTestCases: [{ input: "7\n4 5 6 7 0 1 2\n0", expectedOutput: "4" }],
  },
  {
    title: "Median of Two Sorted Arrays",
    slug: "median-of-two-sorted-arrays",
    difficulty: "Hard",
    description: "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be O(log (m+n)).",
    tags: ["Array", "Binary Search", "Divide and Conquer"],
    testCases: [
      { input: "2\n1 3\n1\n2", expectedOutput: "2.0" },
      { input: "2\n1 2\n2\n3 4", expectedOutput: "2.5" }
    ],
    sampleTestCases: [{ input: "2\n1 3\n1\n2", expectedOutput: "2.0" }],
  },
  {
    title: "Regular Expression Matching",
    slug: "regular-expression-matching",
    difficulty: "Hard",
    description: "Given an input string s and a pattern p, implement regular expression matching with support for '.' and '*' where:\n\n'.' Matches any single character.\n'*' Matches zero or more of the preceding element.\n\nThe matching should cover the entire input string (not partial).",
    tags: ["String", "Dynamic Programming", "Recursion"],
    testCases: [
      { input: "aa\na", expectedOutput: "false" },
      { input: "aa\na*", expectedOutput: "true" },
      { input: "ab\n.*", expectedOutput: "true" }
    ],
    sampleTestCases: [{ input: "aa\na*", expectedOutput: "true" }],
  },
  {
    title: "Trapping Rain Water",
    slug: "trapping-rain-water",
    difficulty: "Hard",
    description: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    tags: ["Array", "Two Pointers", "Dynamic Programming", "Stack"],
    testCases: [
      { input: "12\n0 1 0 2 1 0 1 3 2 1 2 1", expectedOutput: "6" },
      { input: "6\n4 2 0 3 2 5", expectedOutput: "9" }
    ],
    sampleTestCases: [{ input: "12\n0 1 0 2 1 0 1 3 2 1 2 1", expectedOutput: "6" }],
  },
  {
    title: "N-Queens",
    slug: "n-queens",
    difficulty: "Hard",
    description: "The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other.\n\nGiven an integer n, return all distinct solutions to the n-queens puzzle. You may return the answer in any order.",
    tags: ["Backtracking", "Recursion"],
    testCases: [
      { input: "4", expectedOutput: ".Q..\n...Q\nQ...\n..Q.\n\n..Q.\nQ...\n...Q\n.Q.." },
      { input: "1", expectedOutput: "Q" }
    ],
    sampleTestCases: [{ input: "4", expectedOutput: ".Q..\n...Q\nQ...\n..Q.\n\n..Q.\nQ...\n...Q\n.Q.." }],
  },
];

const submissionCode = `import sys\nprint(sys.stdin.read().strip())`;

const TARGET_HIDDEN_CASES = 100;

const dedupeCases = (cases = []) => {
  const seen = new Set();
  const unique = [];

  for (const tc of cases) {
    const key = `${tc.input || ""}||${tc.expectedOutput || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ input: tc.input || "", expectedOutput: tc.expectedOutput || "" });
  }

  return unique;
};

const ensureSampleCases = (sampleCases = [], fallbackCases = []) => {
  const base = dedupeCases([...sampleCases, ...fallbackCases]);
  if (base.length === 0) {
    return [
      { input: "", expectedOutput: "" },
      { input: "", expectedOutput: "" },
      { input: "", expectedOutput: "" },
    ];
  }

  const out = base.slice(0, 3);
  while (out.length < 3) {
    out.push(base[out.length % base.length]);
  }
  return out;
};

const buildHiddenCases = (cases = [], target = TARGET_HIDDEN_CASES) => {
  const base = dedupeCases(cases);
  if (base.length === 0) return [];

  const out = [];
  for (let i = 0; i < target; i += 1) {
    out.push(base[i % base.length]);
  }
  return out;
};

const buildConstraints = (problem) => {
  if (problem.constraints) return problem.constraints;

  return [
    "1 <= input size <= 100000",
    "-10^9 <= value <= 10^9",
    "Expected time complexity: O(n log n) or better when possible",
    "Output format must exactly match the sample output",
  ].join("\n");
};

const run = async () => {
  await connectDb();

  await Promise.all([
    User.deleteMany({ email: { $in: usersData.map((u) => u.email) } }),
    Problem.deleteMany({ slug: { $in: problemsData.map((p) => p.slug) } }),
    Contest.deleteMany({}),
    Submission.deleteMany({}),
    UserTopicStats.deleteMany({}),
    ContestSubmission.deleteMany({}),
    ProblemStats.deleteMany({}),
    UserProblemStatus.deleteMany({}),
    DailyActivity.deleteMany({}),
  ]);

  // Create users individually to trigger pre-save hooks for password hashing
  const admin = await User.create(usersData[0]);
  const alice = await User.create(usersData[1]);
  const bob = await User.create(usersData[2]);
  const users = [admin, alice, bob];

  const preparedProblems = problemsData.map((problem, index) => {
    const sampleTestCases = ensureSampleCases(problem.sampleTestCases, problem.testCases);
    const hiddenTestCases = buildHiddenCases(problem.testCases, TARGET_HIDDEN_CASES);

    return {
      ...problem,
      questionNumber: index + 1,
      constraints: buildConstraints(problem),
      sampleTestCases,
      testCases: hiddenTestCases,
      hiddenTestCaseCount: hiddenTestCases.length,
      isPublished: true,
      createdBy: admin._id,
      difficultyScore: problem.difficulty === "Easy" ? 3 : problem.difficulty === "Medium" ? 5 : 8,
    };
  });

  const problems = await Problem.insertMany(preparedProblems);

  // Create multiple contests with different states
  const liveContest = await Contest.create({
    title: "AlgoForge Weekly #1",
    description: "Test your skills with fundamental algorithms and data structures. Perfect for beginners!",
    startTime: new Date(Date.now() - 30 * 60 * 1000), // Started 30 min ago
    endTime: new Date(Date.now() + 90 * 60 * 1000), // Ends in 90 min
    duration: 120,
    problems: problems.slice(0, 5).map((p) => p._id),
    participants: [{ user: alice._id }, { user: bob._id }],
    createdBy: admin._id,
    scoringType: "ICPC",
  });

  await Contest.create({
    title: "Dummy Live Contest",
    description: "Demo live contest for UI/testing. Keep this running during local development.",
    startTime: new Date(Date.now() - 10 * 60 * 1000), // Started 10 min ago
    endTime: new Date(Date.now() + 50 * 60 * 1000), // Ends in 50 min
    duration: 60,
    problems: problems.slice(0, 3).map((p) => p._id),
    participants: [{ user: admin._id }],
    createdBy: admin._id,
    scoringType: "ICPC",
  });

  const upcomingContest1 = await Contest.create({
    title: "AlgoForge Beginner Cup",
    description: "A friendly competition for those new to competitive programming. Easy to medium problems.",
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // Starts in 2 hours
    endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 2-hour duration
    duration: 120,
    problems: problems.slice(0, 6).map((p) => p._id),
    participants: [{ user: alice._id }],
    createdBy: admin._id,
    scoringType: "IOI",
  });

  const upcomingContest2 = await Contest.create({
    title: "Advanced Algorithms Challenge",
    description: "For experienced coders. Includes medium and hard problems covering graphs, DP, and more.",
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endTime: new Date(Date.now() + 27 * 60 * 60 * 1000), // 3-hour duration
    duration: 180,
    problems: problems.slice(5, 12).map((p) => p._id),
    participants: [],
    createdBy: admin._id,
    scoringType: "ICPC",
  });

  const upcomingContest3 = await Contest.create({
    title: "Weekly Sprint #42",
    description: "Fast-paced problem solving. 5 problems, 90 minutes. Can you ace them all?",
    startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // In 2 days
    endTime: new Date(Date.now() + 49.5 * 60 * 60 * 1000), // 90-min duration
    duration: 90,
    problems: problems.slice(2, 7).map((p) => p._id),
    participants: [{ user: bob._id }],
    createdBy: admin._id,
    scoringType: "ICPC",
  });

  const endedContest1 = await Contest.create({
    title: "AlgoForge Kickoff Contest",
    description: "The inaugural contest that started it all. A mix of classic problems.",
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
    endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2-hour duration
    duration: 120,
    problems: problems.slice(0, 4).map((p) => p._id),
    participants: [{ user: alice._id }, { user: bob._id }, { user: admin._id }],
    createdBy: admin._id,
    scoringType: "ICPC",
  });

  const endedContest2 = await Contest.create({
    title: "Data Structures Showdown",
    description: "Testing mastery of trees, graphs, heaps, and hash tables.",
    startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3-hour duration
    duration: 180,
    problems: problems.slice(4, 10).map((p) => p._id),
    participants: [{ user: alice._id }, { user: bob._id }],
    createdBy: admin._id,
    scoringType: "IOI",
  });

  const contest = liveContest;

  // Helper: look up problem by index to get tags & difficulty for denormalization
  const sub = (userRef, probIdx, lang, codeStr, verdict, runtime, result, contestRef, extra = {}) => {
    const p = problems[probIdx];
    return {
      user: userRef._id,
      problem: p._id,
      language: lang,
      code: codeStr,
      status: "completed",
      verdict,
      runtime,
      result,
      topicTags: p.tags,
      difficulty: p.difficulty,
      codeLength: codeStr.length,
      attemptNumber: extra.attemptNumber || 1,
      isFirstAccepted: extra.isFirstAccepted || false,
      ...(contestRef ? { contest: contestRef._id } : {}),
    };
  };

  const submissionsData = [
    // Live contest submissions
    sub(alice, 0, "python", submissionCode, "Accepted", 20, { stdout: "0 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 }, liveContest, { isFirstAccepted: true }),
    sub(alice, 1, "python", submissionCode, "Accepted", 15, { stdout: "true", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 }, liveContest, { isFirstAccepted: true }),
    sub(alice, 2, "cpp", submissionCode, "Accepted", 12, { stdout: "5 4 3 2 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 }, liveContest, { isFirstAccepted: true }),
    sub(bob, 0, "javascript", "console.log('0 1')", "Accepted", 25, { stdout: "0 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 }, liveContest, { isFirstAccepted: true }),
    sub(bob, 1, "javascript", "console.log('false')", "Wrong Answer", 30, { stdout: "false", stderr: "", compileOutput: "", passedCount: 0, totalCount: 1 }, liveContest),
    // Ended contest submissions
    sub(admin, 0, "python", submissionCode, "Accepted", 18, { stdout: "0 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 }, endedContest1, { isFirstAccepted: true }),
    sub(admin, 1, "python", submissionCode, "Accepted", 14, { stdout: "true", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 }, endedContest1, { isFirstAccepted: true }),
    sub(admin, 2, "python", submissionCode, "Accepted", 16, { stdout: "5 4 3 2 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 }, endedContest1, { isFirstAccepted: true }),
    sub(alice, 0, "cpp", submissionCode, "Accepted", 10, { stdout: "0 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 }, endedContest1, { attemptNumber: 2 }),
    sub(alice, 1, "cpp", submissionCode, "Accepted", 11, { stdout: "true", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 }, endedContest1, { attemptNumber: 2 }),
    sub(bob, 0, "python", submissionCode, "Accepted", 22, { stdout: "0 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 }, endedContest1, { attemptNumber: 2 }),
    // Practice submissions (no contest)
    sub(admin, 5, "python", submissionCode, "Accepted", 25, { stdout: "3", stderr: "", compileOutput: "", passedCount: 3, totalCount: 3 }, null, { isFirstAccepted: true }),
    sub(alice, 5, "javascript", submissionCode, "Time Limit Exceeded", 5000, { stdout: "", stderr: "TLE", compileOutput: "", passedCount: 1, totalCount: 3 }, null),
    sub(bob, 6, "python", submissionCode, "Runtime Error", 0, { stdout: "", stderr: "TypeError: 'NoneType' object is not subscriptable", compileOutput: "", passedCount: 0, totalCount: 3 }, null),
  ];

  const insertedSubmissions = await Submission.insertMany(submissionsData);

  // --- Populate derived collections ---

  // Build a problemId → problem map
  const problemMap = {};
  for (const p of problems) {
    problemMap[p._id.toString()] = p;
  }

  // 1. ProblemStats: aggregate submission counts per problem
  const problemStatsMap = {};
  for (const s of submissionsData) {
    const pid = s.problem.toString();
    if (!problemStatsMap[pid]) {
      problemStatsMap[pid] = { problemId: s.problem, totalSubmissions: 0, acceptedSubmissions: 0, languageBreakdown: {} };
    }
    problemStatsMap[pid].totalSubmissions += 1;
    if (s.verdict === "Accepted") problemStatsMap[pid].acceptedSubmissions += 1;
    problemStatsMap[pid].languageBreakdown[s.language] = (problemStatsMap[pid].languageBreakdown[s.language] || 0) + 1;
  }
  await ProblemStats.insertMany(Object.values(problemStatsMap));

  // 2. UserProblemStatus: per user x problem
  const upStatusMap = {};
  for (const s of submissionsData) {
    const key = `${s.user.toString()}_${s.problem.toString()}`;
    if (!upStatusMap[key]) {
      upStatusMap[key] = {
        userId: s.user,
        problemId: s.problem,
        status: "attempted",
        attempts: 0,
        bestRuntime: null,
      };
    }
    upStatusMap[key].attempts += 1;
    if (s.verdict === "Accepted") {
      upStatusMap[key].status = "solved";
      if (upStatusMap[key].bestRuntime === null || s.runtime < upStatusMap[key].bestRuntime) {
        upStatusMap[key].bestRuntime = s.runtime;
      }
    }
  }
  await UserProblemStatus.insertMany(Object.values(upStatusMap));

  // 3. UserTopicStats: per user x topic
  const utStatsMap = {};
  for (const s of submissionsData) {
    for (const tag of (s.topicTags || [])) {
      const key = `${s.user.toString()}_${tag}`;
      if (!utStatsMap[key]) {
        utStatsMap[key] = {
          userId: s.user,
          topic: tag,
          totalAttempts: 0,
          totalSolved: 0,
          easy: { attempts: 0, solved: 0 },
          medium: { attempts: 0, solved: 0 },
          hard: { attempts: 0, solved: 0 },
        };
      }
      const entry = utStatsMap[key];
      entry.totalAttempts += 1;
      const diff = (s.difficulty || "").toLowerCase();
      if (entry[diff]) entry[diff].attempts += 1;
      if (s.verdict === "Accepted") {
        entry.totalSolved += 1;
        if (entry[diff]) entry[diff].solved += 1;
      }
    }
  }
  // Compute accuracy
  for (const entry of Object.values(utStatsMap)) {
    entry.accuracy = entry.totalAttempts > 0 ? Math.round((entry.totalSolved / entry.totalAttempts) * 100) : 0;
  }
  await UserTopicStats.insertMany(Object.values(utStatsMap));

  // 4. DailyActivity: put all submissions on today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyMap = {};
  for (const s of submissionsData) {
    const uid = s.user.toString();
    if (!dailyMap[uid]) {
      dailyMap[uid] = {
        userId: s.user,
        date: today,
        submissionCount: 0,
        acceptedCount: 0,
        problemsAttempted: new Set(),
        problemsSolved: new Set(),
        topicsPracticed: new Set(),
      };
    }
    const d = dailyMap[uid];
    d.submissionCount += 1;
    d.problemsAttempted.add(s.problem.toString());
    if (s.verdict === "Accepted") {
      d.acceptedCount += 1;
      d.problemsSolved.add(s.problem.toString());
    }
    for (const tag of (s.topicTags || [])) d.topicsPracticed.add(tag);
  }
  await DailyActivity.insertMany(
    Object.values(dailyMap).map((d) => ({
      userId: d.userId,
      date: d.date,
      submissionCount: d.submissionCount,
      acceptedCount: d.acceptedCount,
      problemsAttempted: d.problemsAttempted.size,
      problemsSolved: d.problemsSolved.size,
      topicsPracticed: [...d.topicsPracticed],
    }))
  );

  // 5. Update User denormalized counters
  for (const u of users) {
    const userSubs = submissionsData.filter((s) => s.user.toString() === u._id.toString());
    const accepted = userSubs.filter((s) => s.verdict === "Accepted");
    const solvedProblemIds = [...new Set(accepted.map((s) => s.problem.toString()))];
    const solvedProblems = solvedProblemIds.map((pid) => problemMap[pid]).filter(Boolean);

    await User.findByIdAndUpdate(u._id, {
      totalSubmissions: userSubs.length,
      totalSolved: solvedProblemIds.length,
      easyCount: solvedProblems.filter((p) => p.difficulty === "Easy").length,
      mediumCount: solvedProblems.filter((p) => p.difficulty === "Medium").length,
      hardCount: solvedProblems.filter((p) => p.difficulty === "Hard").length,
      currentStreak: 1,
      maxStreak: 1,
      lastActiveDate: today,
    });
  }

  // 6. ContestSubmission records for contest submissions
  const contestSubDocs = [];
  for (const s of insertedSubmissions) {
    if (!s.contest) continue;
    contestSubDocs.push({
      contest: s.contest,
      user: s.user,
      problem: s.problem,
      submission: s._id,
      verdict: s.verdict,
      solved: s.verdict === "Accepted",
      penaltyMinutes: s.verdict === "Accepted" ? Math.floor(s.runtime / 60) : 0,
      points: s.verdict === "Accepted" ? 100 : 0,
    });
  }
  if (contestSubDocs.length > 0) {
    await ContestSubmission.insertMany(contestSubDocs);
  }

  console.log(`  → ${problems.length} problems (isPublished: true)`);
  console.log(`  → ${insertedSubmissions.length} submissions (with topicTags/difficulty)`);
  console.log(`  → ${Object.keys(problemStatsMap).length} ProblemStats docs`);
  console.log(`  → ${Object.keys(upStatusMap).length} UserProblemStatus docs`);
  console.log(`  → ${Object.keys(utStatsMap).length} UserTopicStats docs`);
  console.log(`  → ${Object.keys(dailyMap).length} DailyActivity docs`);
  console.log(`  → ${contestSubDocs.length} ContestSubmission docs`);

  await mongoose.disconnect();
};

run()
  .then(() => {
    console.log("✅ Seed completed successfully");
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("❌ Seed failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  });
