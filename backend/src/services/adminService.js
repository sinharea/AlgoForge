const path = require("path");
const slugify = require("slugify");
const User = require("../models/User");
const Problem = require("../models/Problem");
const Contest = require("../models/Contest");
const Submission = require("../models/Submission");
const Report = require("../models/Report");
const TestCase = require("../models/TestCase");
const AdminLog = require("../models/AdminLog");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const ApiError = require("../utils/apiError");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const toUploadPublicPath = (absoluteFilePath) => {
  if (!absoluteFilePath) return "";
  const uploadsRoot = path.join(process.cwd(), "uploads");
  const relative = path.relative(uploadsRoot, absoluteFilePath);
  return `/uploads/${relative.replace(/\\/g, "/")}`;
};

const normalizeTags = (tags = []) =>
  [...new Set((tags || []).map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];

const ensureObjectId = (value, fieldName) => {
  if (!value || !String(value).match(/^[a-fA-F0-9]{24}$/)) {
    throw ApiError.badRequest(`Invalid ${fieldName}`);
  }
};

const generateProblemSlug = (title) =>
  slugify(title, { lower: true, strict: true, trim: true });

const getNextQuestionNumber = async () => {
  const latest = await Problem.findOne({ questionNumber: { $exists: true } })
    .sort({ questionNumber: -1 })
    .select("questionNumber");
  return (latest?.questionNumber || 0) + 1;
};

const createAdminLog = async ({ adminId, action, targetType, targetId = null, metadata = {} }) =>
  AdminLog.create({
    adminId,
    action,
    targetType,
    targetId,
    metadata,
  });

const createAdminProblem = async ({ adminId, payload }) => {
  const slug = payload.slug || generateProblemSlug(payload.title);
  const existingSlug = await Problem.findOne({ slug }).select("_id");
  if (existingSlug) throw ApiError.conflict("Problem slug already exists");

  let questionNumber = payload.questionNumber;
  if (questionNumber) {
    const existingQuestionNumber = await Problem.findOne({ questionNumber }).select("_id");
    if (existingQuestionNumber) throw ApiError.conflict("Question number already exists");
  } else {
    questionNumber = await getNextQuestionNumber();
  }

  const problem = await Problem.create({
    ...payload,
    slug,
    questionNumber,
    tags: normalizeTags(payload.tags),
    testCases: [],
    sampleTestCases: [],
    hiddenTestCaseCount: 0,
  });

  await createAdminLog({
    adminId,
    action: "problem.create",
    targetType: "problem",
    targetId: problem._id,
  });

  return problem;
};

const updateAdminProblem = async ({ adminId, problemId, payload }) => {
  const update = { ...payload };

  if (update.title && !update.slug) {
    update.slug = generateProblemSlug(update.title);
  }

  if (update.slug) {
    const existingSlug = await Problem.findOne({ slug: update.slug, _id: { $ne: problemId } }).select("_id");
    if (existingSlug) throw ApiError.conflict("Problem slug already exists");
  }

  if (update.questionNumber) {
    const existingQuestionNumber = await Problem.findOne({
      questionNumber: update.questionNumber,
      _id: { $ne: problemId },
    }).select("_id");
    if (existingQuestionNumber) throw ApiError.conflict("Question number already exists");
  }

  if (Array.isArray(update.tags)) {
    update.tags = normalizeTags(update.tags);
  }

  const problem = await Problem.findByIdAndUpdate(problemId, update, {
    new: true,
    runValidators: true,
  });

  if (!problem) throw ApiError.notFound("Problem not found");

  await createAdminLog({
    adminId,
    action: "problem.update",
    targetType: "problem",
    targetId: problem._id,
  });

  return problem;
};

const deleteAdminProblem = async ({ adminId, problemId }) => {
  const problem = await Problem.findByIdAndDelete(problemId);
  if (!problem) throw ApiError.notFound("Problem not found");

  await TestCase.deleteMany({ problemId });

  await createAdminLog({
    adminId,
    action: "problem.delete",
    targetType: "problem",
    targetId: problem._id,
  });

  return {
    message: "Problem deleted successfully",
    problemId,
  };
};

const syncProblemTestCaseCounters = async (problemId) => {
  const hiddenCount = await TestCase.countDocuments({ problemId, isHidden: true });
  await Problem.findByIdAndUpdate(problemId, { hiddenTestCaseCount: hiddenCount });
};

const createAdminTestCases = async ({ adminId, problemId, inlineTestCases, fileTestCases }) => {
  ensureObjectId(problemId, "problemId");

  const problemExists = await Problem.exists({ _id: problemId });
  if (!problemExists) throw ApiError.notFound("Problem not found");

  const inlinePayload = (inlineTestCases || []).map((testCase) => ({
    problemId,
    input: String(testCase.input || ""),
    output: String(testCase.output || ""),
    isHidden: testCase.isHidden !== false,
    storageType: "mongodb",
    createdBy: adminId,
  }));

  const filePayload = (fileTestCases || []).map((testCase) => ({
    problemId,
    input: "",
    output: "",
    isHidden: testCase.isHidden !== false,
    storageType: "file",
    inputFilePath: testCase.inputFilePath || "",
    outputFilePath: testCase.outputFilePath || "",
    createdBy: adminId,
  }));

  if (!inlinePayload.length && !filePayload.length) {
    throw ApiError.badRequest("At least one test case is required");
  }

  const created = await TestCase.insertMany([...inlinePayload, ...filePayload]);

  if (inlinePayload.length) {
    const hiddenInline = inlinePayload
      .filter((item) => item.isHidden)
      .map((item) => ({ input: item.input, expectedOutput: item.output }));

    const sampleInline = inlinePayload
      .filter((item) => !item.isHidden)
      .map((item) => ({ input: item.input, expectedOutput: item.output }));

    const update = {};
    if (hiddenInline.length) update.$push = { ...(update.$push || {}), testCases: { $each: hiddenInline } };
    if (sampleInline.length) update.$push = { ...(update.$push || {}), sampleTestCases: { $each: sampleInline } };

    if (Object.keys(update).length) {
      await Problem.findByIdAndUpdate(problemId, update);
    }
  }

  await syncProblemTestCaseCounters(problemId);

  await createAdminLog({
    adminId,
    action: "testcase.create",
    targetType: "problem",
    targetId: problemId,
    metadata: {
      createdCount: created.length,
      inlineCount: inlinePayload.length,
      fileCount: filePayload.length,
    },
  });

  return {
    createdCount: created.length,
    items: created,
  };
};

const buildContestPayload = async (payload, contestId = null) => {
  const startTime = payload.startTime ? new Date(payload.startTime) : null;
  const endTime = payload.endTime ? new Date(payload.endTime) : null;

  if (startTime && endTime && endTime <= startTime) {
    throw ApiError.badRequest("endTime must be after startTime");
  }

  if (payload.problemIds?.length) {
    const problemsCount = await Problem.countDocuments({ _id: { $in: payload.problemIds } });
    if (problemsCount !== payload.problemIds.length) {
      throw ApiError.badRequest("One or more problemIds are invalid");
    }
  }

  const update = {};

  if (payload.name !== undefined) update.title = payload.name;
  if (payload.description !== undefined) update.description = payload.description;
  if (startTime) update.startTime = startTime;
  if (endTime) update.endTime = endTime;
  if (payload.problemIds) update.problems = payload.problemIds;

  const existingContest = contestId ? await Contest.findById(contestId).select("startTime endTime") : null;
  if (contestId && !existingContest) throw ApiError.notFound("Contest not found");

  const finalStart = update.startTime || existingContest?.startTime;
  const finalEnd = update.endTime || existingContest?.endTime;

  if (finalStart && finalEnd) {
    update.duration = Math.max(1, Math.ceil((new Date(finalEnd) - new Date(finalStart)) / (1000 * 60)));
  }

  return update;
};

const createAdminContest = async ({ adminId, payload }) => {
  const contestPayload = await buildContestPayload(payload);

  const contest = await Contest.create(contestPayload);

  await createAdminLog({
    adminId,
    action: "contest.create",
    targetType: "contest",
    targetId: contest._id,
  });

  return contest;
};

const updateAdminContest = async ({ adminId, contestId, payload }) => {
  const contestPayload = await buildContestPayload(payload, contestId);

  const contest = await Contest.findByIdAndUpdate(contestId, contestPayload, {
    new: true,
    runValidators: true,
  });

  if (!contest) throw ApiError.notFound("Contest not found");

  await createAdminLog({
    adminId,
    action: "contest.update",
    targetType: "contest",
    targetId: contest._id,
  });

  return contest;
};

const deleteAdminContest = async ({ adminId, contestId }) => {
  const contest = await Contest.findByIdAndDelete(contestId);
  if (!contest) throw ApiError.notFound("Contest not found");

  await createAdminLog({
    adminId,
    action: "contest.delete",
    targetType: "contest",
    targetId: contest._id,
  });

  return {
    message: "Contest deleted successfully",
    contestId,
  };
};

const listAdminUsers = async ({ page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, search, role, status }) => {
  const safePage = Math.max(1, Number(page) || DEFAULT_PAGE);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || DEFAULT_LIMIT));

  const filter = {
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("name email role status createdAt")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    User.countDocuments(filter),
  ]);

  const normalizedItems = items.map((user) => ({
    ...user.toObject(),
    status: user.status || "active",
  }));

  return {
    items: normalizedItems,
    page: safePage,
    limit: safeLimit,
    total,
    pages: Math.max(1, Math.ceil(total / safeLimit)),
  };
};

const updateUserStatus = async ({ adminId, userId, status }) => {
  const user = await User.findById(userId).select("name role status");
  if (!user) throw ApiError.notFound("User not found");

  if (status === "banned" && user.role === "admin") {
    throw ApiError.forbidden("Cannot ban an admin account");
  }

  user.status = status;
  await user.save();

  await createAdminLog({
    adminId,
    action: status === "banned" ? "user.ban" : "user.unban",
    targetType: "user",
    targetId: user._id,
  });

  return user;
};

const listAdminReports = async ({ page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, status }) => {
  const safePage = Math.max(1, Number(page) || DEFAULT_PAGE);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || DEFAULT_LIMIT));

  const filter = status ? { status } : {};

  const [items, total] = await Promise.all([
    Report.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    Report.countDocuments(filter),
  ]);

  return {
    items,
    page: safePage,
    limit: safeLimit,
    total,
    pages: Math.max(1, Math.ceil(total / safeLimit)),
  };
};

const deleteReportTarget = async (report) => {
  const targetId = report.targetId;
  const targetType = report.targetType;

  const deleteByType = async (type) => {
    if (type === "post") return Post.findByIdAndDelete(targetId);
    if (type === "comment") return Comment.findByIdAndDelete(targetId);
    if (type === "problem") return Problem.findByIdAndDelete(targetId);
    if (type === "submission") return Submission.findByIdAndDelete(targetId);
    return null;
  };

  if (targetType && targetType !== "other") {
    const deleted = await deleteByType(targetType);
    return Boolean(deleted);
  }

  const deletedFallback =
    (await Post.findByIdAndDelete(targetId)) ||
    (await Comment.findByIdAndDelete(targetId)) ||
    (await Problem.findByIdAndDelete(targetId)) ||
    (await Submission.findByIdAndDelete(targetId));

  return Boolean(deletedFallback);
};

const resolveAdminReport = async ({ adminId, reportId, action }) => {
  const report = await Report.findById(reportId);
  if (!report) throw ApiError.notFound("Report not found");

  let deletedTarget = false;
  if (action === "delete") {
    deletedTarget = await deleteReportTarget(report);
  }

  report.status = "resolved";
  report.moderationAction = action;
  report.resolvedBy = adminId;
  report.resolvedAt = new Date();
  await report.save();

  await createAdminLog({
    adminId,
    action: `report.${action}`,
    targetType: "report",
    targetId: report._id,
    metadata: { deletedTarget },
  });

  return {
    report,
    deletedTarget,
  };
};

const getAdminAnalytics = async () => {
  const [totalUsers, activeUsers, submissionsPerDay, popularProblems] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: { $ne: "banned" } }),
    Submission.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: 1,
        },
      },
    ]),
    Submission.aggregate([
      {
        $group: {
          _id: "$problem",
          submissions: { $sum: 1 },
        },
      },
      { $sort: { submissions: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "problems",
          localField: "_id",
          foreignField: "_id",
          as: "problem",
        },
      },
      {
        $unwind: {
          path: "$problem",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          problemId: "$_id",
          title: "$problem.title",
          slug: "$problem.slug",
          difficulty: "$problem.difficulty",
          submissions: 1,
        },
      },
    ]),
  ]);

  return {
    totalUsers,
    activeUsers,
    submissionsPerDay,
    popularProblems,
  };
};

const parseInlineTestCases = (rawValue) => {
  if (!rawValue) return [];

  let parsed = rawValue;
  if (typeof rawValue === "string") {
    try {
      parsed = JSON.parse(rawValue);
    } catch (error) {
      throw ApiError.badRequest("Invalid testcases payload JSON");
    }
  }

  if (!Array.isArray(parsed)) throw ApiError.badRequest("testcases must be an array");

  return parsed.map((item, index) => {
    const input = String(item?.input || "");
    const output = String(item?.output || "");
    const isHidden = item?.isHidden !== false;

    if (!output) {
      throw ApiError.badRequest(`Inline testcase #${index + 1} must include output`);
    }

    return {
      input,
      output,
      isHidden,
    };
  });
};

const parseFileMeta = (rawValue) => {
  if (!rawValue) return [];

  let parsed = rawValue;
  if (typeof rawValue === "string") {
    try {
      parsed = JSON.parse(rawValue);
    } catch (error) {
      throw ApiError.badRequest("Invalid fileMeta payload JSON");
    }
  }

  if (!Array.isArray(parsed)) throw ApiError.badRequest("fileMeta must be an array");

  return parsed.map((item) => ({
    isHidden: item?.isHidden !== false,
  }));
};

const parseFileTestCases = ({ inputFiles, outputFiles, fileMeta }) => {
  const maxLength = Math.max(inputFiles.length, outputFiles.length);
  const items = [];

  for (let index = 0; index < maxLength; index += 1) {
    const inputFile = inputFiles[index];
    const outputFile = outputFiles[index];
    const metadata = fileMeta[index] || {};

    if (!outputFile) {
      throw ApiError.badRequest(`Missing output file for testcase #${index + 1}`);
    }

    items.push({
      inputFilePath: inputFile ? toUploadPublicPath(inputFile.path) : "",
      outputFilePath: toUploadPublicPath(outputFile.path),
      isHidden: metadata.isHidden !== false,
    });
  }

  return items;
};

module.exports = {
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
};
