const Problem = require("../models/Problem");
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
      .select("title slug difficulty tags")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Problem.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

const getProblemById = asyncHandler(async (req, res) => {
  const problem = await Problem.findById(req.params.id).select("-testCases");
  if (!problem) throw new ApiError(404, "Problem not found");
  res.json(problem);
});

const getProblemBySlug = asyncHandler(async (req, res) => {
  const problem = await Problem.findOne({ slug: req.params.slug }).select("-testCases");
  if (!problem) throw new ApiError(404, "Problem not found");
  res.json(problem);
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
  createProblem: createProblemHandler,
  updateProblem: updateProblemHandler,
  deleteProblem,
};
