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
    description: "Return indices of two numbers summing to target.",
    tags: ["Array", "HashMap"],
    testCases: [{ input: "4\n2 7 11 15\n9", expectedOutput: "0 1" }],
    sampleTestCases: [{ input: "4\n2 7 11 15\n9", expectedOutput: "0 1" }],
  },
  {
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    difficulty: "Easy",
    description: "Check if parentheses string is valid.",
    tags: ["Stack"],
    testCases: [{ input: "()[]{}", expectedOutput: "true" }],
    sampleTestCases: [{ input: "()[]{}", expectedOutput: "true" }],
  },
  {
    title: "Longest Substring Without Repeating Characters",
    slug: "longest-substring-without-repeating-characters",
    difficulty: "Medium",
    description: "Find longest substring without repeating characters.",
    tags: ["String", "Sliding Window"],
    testCases: [{ input: "abcabcbb", expectedOutput: "3" }],
    sampleTestCases: [{ input: "abcabcbb", expectedOutput: "3" }],
  },
  {
    title: "Merge Intervals",
    slug: "merge-intervals",
    difficulty: "Medium",
    description: "Merge overlapping intervals.",
    tags: ["Array", "Sorting"],
    testCases: [{ input: "4\n1 3\n2 6\n8 10\n15 18", expectedOutput: "1 6\n8 10\n15 18" }],
    sampleTestCases: [{ input: "4\n1 3\n2 6\n8 10\n15 18", expectedOutput: "1 6\n8 10\n15 18" }],
  },
  {
    title: "Median of Two Sorted Arrays",
    slug: "median-of-two-sorted-arrays",
    difficulty: "Hard",
    description: "Find median of two sorted arrays.",
    tags: ["Array", "Binary Search"],
    testCases: [{ input: "2\n1 3\n1\n2", expectedOutput: "2.0" }],
    sampleTestCases: [{ input: "2\n1 3\n1\n2", expectedOutput: "2.0" }],
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

  const users = await User.insertMany(usersData);
  const problems = await Problem.insertMany(problemsData);

  const [admin, alice, bob] = users;

  const contest = await Contest.create({
    title: "AlgoForge Weekly #1",
    description: "Starter contest",
    startTime: new Date(Date.now() - 60 * 60 * 1000),
    endTime: new Date(Date.now() + 60 * 60 * 1000),
    duration: 120,
    problems: problems.slice(0, 3).map((p) => p._id),
    participants: [{ user: alice._id }, { user: bob._id }],
  });

  await Submission.insertMany([
    {
      user: alice._id,
      problem: problems[0]._id,
      language: "python",
      code: submissionCode,
      status: "completed",
      verdict: "Accepted",
      runtime: 20,
      result: { stdout: "0 1", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 },
      contest: contest._id,
    },
    {
      user: bob._id,
      problem: problems[1]._id,
      language: "javascript",
      code: "console.log('true')",
      status: "completed",
      verdict: "Wrong Answer",
      runtime: 30,
      result: { stdout: "false", stderr: "", compileOutput: "", passedCount: 0, totalCount: 1 },
      contest: contest._id,
    },
    {
      user: admin._id,
      problem: problems[2]._id,
      language: "python",
      code: submissionCode,
      status: "completed",
      verdict: "Accepted",
      runtime: 25,
      result: { stdout: "3", stderr: "", compileOutput: "", passedCount: 1, totalCount: 1 },
    },
  ]);

  await mongoose.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch(async () => {
    await mongoose.disconnect();
    process.exit(1);
  });
