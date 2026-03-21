require("dotenv").config();
const mongoose = require("mongoose");
const connectDb = require("../config/db");
const User = require("../models/User");
const Problem = require("../models/Problem");
const Submission = require("../models/Submission");
const Contest = require("../models/Contest");
const UserTopicAnalytics = require("../models/UserTopicAnalytics");
const ContestSubmission = require("../models/ContestSubmission");
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

const run = async () => {
  await connectDb();

  await Promise.all([
    User.deleteMany({ email: { $in: usersData.map((u) => u.email) } }),
    Problem.deleteMany({ slug: { $in: problemsData.map((p) => p.slug) } }),
    Contest.deleteMany({}),
    Submission.deleteMany({}),
    UserTopicAnalytics.deleteMany({}),
    ContestSubmission.deleteMany({}),
  ]);

  // Create users individually to trigger pre-save hooks for password hashing
  const admin = await User.create(usersData[0]);
  const alice = await User.create(usersData[1]);
  const bob = await User.create(usersData[2]);
  const users = [admin, alice, bob];

  const problems = await Problem.insertMany(problemsData);

  // Create multiple contests with different states
  const liveContest = await Contest.create({
    title: "AlgoForge Weekly #1",
    description: "Test your skills with fundamental algorithms and data structures. Perfect for beginners!",
    startTime: new Date(Date.now() - 30 * 60 * 1000), // Started 30 min ago
    endTime: new Date(Date.now() + 90 * 60 * 1000), // Ends in 90 min
    duration: 120,
    problems: problems.slice(0, 5).map((p) => p._id),
    participants: [{ user: alice._id }, { user: bob._id }],
  });

  const upcomingContest1 = await Contest.create({
    title: "AlgoForge Beginner Cup",
    description: "A friendly competition for those new to competitive programming. Easy to medium problems.",
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // Starts in 2 hours
    endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 2-hour duration
    duration: 120,
    problems: problems.slice(0, 6).map((p) => p._id),
    participants: [{ user: alice._id }],
  });

  const upcomingContest2 = await Contest.create({
    title: "Advanced Algorithms Challenge",
    description: "For experienced coders. Includes medium and hard problems covering graphs, DP, and more.",
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endTime: new Date(Date.now() + 27 * 60 * 60 * 1000), // 3-hour duration
    duration: 180,
    problems: problems.slice(5, 12).map((p) => p._id),
    participants: [],
  });

  const upcomingContest3 = await Contest.create({
    title: "Weekly Sprint #42",
    description: "Fast-paced problem solving. 5 problems, 90 minutes. Can you ace them all?",
    startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // In 2 days
    endTime: new Date(Date.now() + 49.5 * 60 * 60 * 1000), // 90-min duration
    duration: 90,
    problems: problems.slice(2, 7).map((p) => p._id),
    participants: [{ user: bob._id }],
  });

  const endedContest1 = await Contest.create({
    title: "AlgoForge Kickoff Contest",
    description: "The inaugural contest that started it all. A mix of classic problems.",
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
    endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2-hour duration
    duration: 120,
    problems: problems.slice(0, 4).map((p) => p._id),
    participants: [{ user: alice._id }, { user: bob._id }, { user: admin._id }],
  });

  const endedContest2 = await Contest.create({
    title: "Data Structures Showdown",
    description: "Testing mastery of trees, graphs, heaps, and hash tables.",
    startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3-hour duration
    duration: 180,
    problems: problems.slice(4, 10).map((p) => p._id),
    participants: [{ user: alice._id }, { user: bob._id }],
  });

  const contest = liveContest;

  await Submission.insertMany([
    // Live contest submissions
    {
      user: alice._id,
      problem: problems[0]._id,
      language: "python",
      code: submissionCode,
      status: "completed",
      verdict: "Accepted",
      runtime: 20,
      result: { stdout: "0 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 },
      contest: liveContest._id,
    },
    {
      user: alice._id,
      problem: problems[1]._id,
      language: "python",
      code: submissionCode,
      status: "completed",
      verdict: "Accepted",
      runtime: 15,
      result: { stdout: "true", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 },
      contest: liveContest._id,
    },
    {
      user: alice._id,
      problem: problems[2]._id,
      language: "cpp",
      code: submissionCode,
      status: "completed",
      verdict: "Accepted",
      runtime: 12,
      result: { stdout: "5 4 3 2 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 },
      contest: liveContest._id,
    },
    {
      user: bob._id,
      problem: problems[0]._id,
      language: "javascript",
      code: "console.log('0 1')",
      status: "completed",
      verdict: "Accepted",
      runtime: 25,
      result: { stdout: "0 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 },
      contest: liveContest._id,
    },
    {
      user: bob._id,
      problem: problems[1]._id,
      language: "javascript",
      code: "console.log('false')",
      status: "completed",
      verdict: "Wrong Answer",
      runtime: 30,
      result: { stdout: "false", stderr: "", compileOutput: "", passedCount: 0, totalCount: 1 },
      contest: liveContest._id,
    },
    // Ended contest submissions
    {
      user: admin._id,
      problem: problems[0]._id,
      language: "python",
      code: submissionCode,
      status: "completed",
      verdict: "Accepted",
      runtime: 18,
      result: { stdout: "0 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 },
      contest: endedContest1._id,
    },
    {
      user: admin._id,
      problem: problems[1]._id,
      language: "python",
      code: submissionCode,
      status: "completed",
      verdict: "Accepted",
      runtime: 14,
      result: { stdout: "true", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 },
      contest: endedContest1._id,
    },
    {
      user: admin._id,
      problem: problems[2]._id,
      language: "python",
      code: submissionCode,
      status: "completed",
      verdict: "Accepted",
      runtime: 16,
      result: { stdout: "5 4 3 2 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 },
      contest: endedContest1._id,
    },
    {
      user: alice._id,
      problem: problems[0]._id,
      language: "cpp",
      code: submissionCode,
      status: "completed",
      verdict: "Accepted",
      runtime: 10,
      result: { stdout: "0 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 },
      contest: endedContest1._id,
    },
    {
      user: alice._id,
      problem: problems[1]._id,
      language: "cpp",
      code: submissionCode,
      status: "completed",
      verdict: "Accepted",
      runtime: 11,
      result: { stdout: "true", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 },
      contest: endedContest1._id,
    },
    {
      user: bob._id,
      problem: problems[0]._id,
      language: "python",
      code: submissionCode,
      status: "completed",
      verdict: "Accepted",
      runtime: 22,
      result: { stdout: "0 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 },
      contest: endedContest1._id,
    },
    // Practice submissions (no contest)
    {
      user: admin._id,
      problem: problems[5]._id,
      language: "python",
      code: submissionCode,
      status: "completed",
      verdict: "Accepted",
      runtime: 25,
      result: { stdout: "3", stderr: "", compileOutput: "", passedCount: 3, totalCount: 3 },
    },
    {
      user: alice._id,
      problem: problems[5]._id,
      language: "javascript",
      code: submissionCode,
      status: "completed",
      verdict: "Time Limit Exceeded",
      runtime: 5000,
      result: { stdout: "", stderr: "TLE", compileOutput: "", passedCount: 1, totalCount: 3 },
    },
    {
      user: bob._id,
      problem: problems[6]._id,
      language: "python",
      code: submissionCode,
      status: "completed",
      verdict: "Runtime Error",
      runtime: 0,
      result: { stdout: "", stderr: "TypeError: 'NoneType' object is not subscriptable", compileOutput: "", passedCount: 0, totalCount: 3 },
    },
  ]);

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
