const Problem = require("../models/Problem");
const ProblemStats = require("../models/ProblemStats");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { createProblem, updateProblem } = require("../services/problemService");

const getAllProblems = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, difficulty, tags, search } = req.query;
  const filter = {};

  if (difficulty) filter.difficulty = difficulty;
  if (tags) filter.tags = { $in: String(tags).split(",").map((v) => v.trim()) };
  if (search) filter.$text = { $search: search };

  const [items, total] = await Promise.all([
    Problem.find(filter)
      .select("questionNumber title slug difficulty tags companyTags hiddenTestCaseCount")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ questionNumber: 1, createdAt: -1 }),
    Problem.countDocuments(filter),
  ]);

  // Attach stats from ProblemStats collection
  const problemIds = items.map((p) => p._id);
  const statsMap = {};
  if (problemIds.length) {
    const stats = await ProblemStats.find({ problemId: { $in: problemIds } })
      .select("problemId totalSubmissions acceptedSubmissions acceptanceRate")
      .lean();
    for (const s of stats) {
      statsMap[String(s.problemId)] = s;
    }
  }

  const enrichedItems = items.map((p) => {
    const pObj = p.toObject();
    const stats = statsMap[String(p._id)] || {};
    pObj.submissionCount = stats.totalSubmissions || 0;
    pObj.acceptedCount = stats.acceptedSubmissions || 0;
    pObj.acceptanceRate = stats.acceptanceRate || 0;
    return pObj;
  });

  res.json({
    items: enrichedItems,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

const getProblemById = asyncHandler(async (req, res) => {
  const problem = await Problem.findById(req.params.id).select("-testCases -editorialSolution -editorialApproach");
  if (!problem) throw new ApiError(404, "Problem not found");
  res.json(problem);
});

const getProblemBySlug = asyncHandler(async (req, res) => {
  const problem = await Problem.findOne({ slug: req.params.slug }).select("-testCases -editorialSolution -editorialApproach");
  if (!problem) throw new ApiError(404, "Problem not found");
  res.json(problem);
});

const getHints = asyncHandler(async (req, res) => {
  const problem = await Problem.findOne({ slug: req.params.slug }).select("hints");
  if (!problem) throw new ApiError(404, "Problem not found");

  const level = Number(req.query.level) || 0;
  const hints = (problem.hints || [])
    .filter((h) => level === 0 || h.level <= level)
    .sort((a, b) => a.level - b.level);

  res.json({ hints, total: problem.hints?.length || 0 });
});

const getEditorial = asyncHandler(async (req, res) => {
  const problem = await Problem.findOne({ slug: req.params.slug })
    .select("editorialSolution editorialApproach optimalComplexity");
  if (!problem) throw new ApiError(404, "Problem not found");

  res.json({
    editorial: problem.editorialSolution || "",
    approach: problem.editorialApproach || "",
    optimalComplexity: problem.optimalComplexity || {},
  });
});

const getSimilarProblems = asyncHandler(async (req, res) => {
  const problem = await Problem.findOne({ slug: req.params.slug }).select("tags difficulty similarProblems");
  if (!problem) throw new ApiError(404, "Problem not found");

  let similar = [];
  if (problem.similarProblems?.length) {
    similar = await Problem.find({ _id: { $in: problem.similarProblems } })
      .select("title slug difficulty tags")
      .limit(6)
      .lean();
  }

  if (similar.length < 6 && problem.tags?.length) {
    const extraIds = similar.map((s) => s._id);
    extraIds.push(problem._id);
    const extra = await Problem.find({
      _id: { $nin: extraIds },
      tags: { $in: problem.tags },
      difficulty: problem.difficulty,
    })
      .select("title slug difficulty tags")
      .limit(6 - similar.length)
      .lean();
    similar.push(...extra);
  }

  res.json({ similar });
});

const createProblemHandler = asyncHandler(async (req, res) => {
  const problem = await createProblem(req.body);
  res.status(201).json(problem);
});

const updateProblemHandler = asyncHandler(async (req, res) => {
  const problem = await updateProblem(req.params.id, req.body);
  res.json(problem);
});

const deleteProblem = asyncHandler(async (req, res) => {
  const deleted = await Problem.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, "Problem not found");
  res.json({ message: "Problem deleted successfully" });
});

module.exports = {
  getAllProblems,
  getProblemById,
  getProblemBySlug,
  getHints,
  getEditorial,
  getSimilarProblems,
  createProblem: createProblemHandler,
  updateProblem: updateProblemHandler,
  deleteProblem,
};
