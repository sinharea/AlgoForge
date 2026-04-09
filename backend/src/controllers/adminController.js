const asyncHandler = require("../utils/asyncHandler");
const {
  createAdminProblem,
  updateAdminProblem,
  deleteAdminProblem,
  createAdminTestCases,
  createAdminContest,
  updateAdminContest,
  deleteAdminContest,
  listAdminUsers,
  updateUserStatus,
  listAdminReports,
  resolveAdminReport,
  getAdminAnalytics,
  parseInlineTestCases,
  parseFileMeta,
  parseFileTestCases,
} = require("../services/adminService");

const createProblem = asyncHandler(async (req, res) => {
  const problem = await createAdminProblem({
    adminId: req.user._id,
    payload: req.body,
  });

  res.status(201).json(problem);
});

const updateProblem = asyncHandler(async (req, res) => {
  const problem = await updateAdminProblem({
    adminId: req.user._id,
    problemId: req.params.id,
    payload: req.body,
  });

  res.json(problem);
});

const deleteProblem = asyncHandler(async (req, res) => {
  const payload = await deleteAdminProblem({
    adminId: req.user._id,
    problemId: req.params.id,
  });

  res.json(payload);
});

const createTestcases = asyncHandler(async (req, res) => {
  const inputFiles = req.files?.inputFiles || [];
  const outputFiles = req.files?.outputFiles || [];

  const inlineTestCases = parseInlineTestCases(req.body.testcases);
  const fileMeta = parseFileMeta(req.body.fileMeta);
  const fileTestCases = parseFileTestCases({ inputFiles, outputFiles, fileMeta });

  const payload = await createAdminTestCases({
    adminId: req.user._id,
    problemId: req.body.problemId,
    inlineTestCases,
    fileTestCases,
  });

  res.status(201).json(payload);
});

const createContest = asyncHandler(async (req, res) => {
  const contest = await createAdminContest({
    adminId: req.user._id,
    payload: req.body,
  });

  res.status(201).json(contest);
});

const updateContest = asyncHandler(async (req, res) => {
  const contest = await updateAdminContest({
    adminId: req.user._id,
    contestId: req.params.id,
    payload: req.body,
  });

  res.json(contest);
});

const deleteContest = asyncHandler(async (req, res) => {
  const payload = await deleteAdminContest({
    adminId: req.user._id,
    contestId: req.params.id,
  });

  res.json(payload);
});

const getUsers = asyncHandler(async (req, res) => {
  const payload = await listAdminUsers(req.query);
  res.json(payload);
});

const banUser = asyncHandler(async (req, res) => {
  const user = await updateUserStatus({
    adminId: req.user._id,
    userId: req.body.userId,
    status: "banned",
  });

  res.json({ message: "User banned", user });
});

const unbanUser = asyncHandler(async (req, res) => {
  const user = await updateUserStatus({
    adminId: req.user._id,
    userId: req.body.userId,
    status: "active",
  });

  res.json({ message: "User unbanned", user });
});

const getReports = asyncHandler(async (req, res) => {
  const payload = await listAdminReports(req.query);
  res.json(payload);
});

const reportAction = asyncHandler(async (req, res) => {
  const payload = await resolveAdminReport({
    adminId: req.user._id,
    reportId: req.body.reportId,
    action: req.body.action,
  });

  res.json(payload);
});

const getAnalytics = asyncHandler(async (req, res) => {
  const payload = await getAdminAnalytics();
  res.json(payload);
});

module.exports = {
  createProblem,
  updateProblem,
  deleteProblem,
  createTestcases,
  createContest,
  updateContest,
  deleteContest,
  getUsers,
  banUser,
  unbanUser,
  getReports,
  reportAction,
  getAnalytics,
};
