const slugify = require("slugify");
const Problem = require("../models/Problem");
const ApiError = require("../utils/apiError");

const generateSlug = (title) =>
  slugify(title, { lower: true, strict: true, trim: true });

const getNextQuestionNumber = async () => {
  const latest = await Problem.findOne({ questionNumber: { $exists: true } })
    .sort({ questionNumber: -1 })
    .select("questionNumber");
  return (latest?.questionNumber || 0) + 1;
};

const createProblem = async (payload) => {
  const slug = payload.slug || generateSlug(payload.title);
  const exists = await Problem.findOne({ slug });
  if (exists) throw new ApiError(409, "Problem slug already exists");

  let questionNumber = payload.questionNumber;
  if (questionNumber) {
    const qExists = await Problem.findOne({ questionNumber }).select("_id");
    if (qExists) throw new ApiError(409, "Question number already exists");
  } else {
    questionNumber = await getNextQuestionNumber();
  }

  const hiddenTestCaseCount = Array.isArray(payload.testCases) ? payload.testCases.length : 0;

  return Problem.create({
    ...payload,
    slug,
    questionNumber,
    hiddenTestCaseCount,
  });
};

const updateProblem = async (problemId, payload) => {
  if (payload.title && !payload.slug) {
    payload.slug = generateSlug(payload.title);
  }

  if (payload.questionNumber) {
    const qExists = await Problem.findOne({
      questionNumber: payload.questionNumber,
      _id: { $ne: problemId },
    }).select("_id");
    if (qExists) throw new ApiError(409, "Question number already exists");
  }

  if (Array.isArray(payload.testCases)) {
    payload.hiddenTestCaseCount = payload.testCases.length;
  }

  const problem = await Problem.findByIdAndUpdate(problemId, payload, {
    new: true,
    runValidators: true,
  });
  if (!problem) throw new ApiError(404, "Problem not found");
  return problem;
};

module.exports = {
  createProblem,
  updateProblem,
};
