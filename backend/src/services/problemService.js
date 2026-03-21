const slugify = require("slugify");
const Problem = require("../models/Problem");
const ApiError = require("../utils/apiError");

const generateSlug = (title) =>
  slugify(title, { lower: true, strict: true, trim: true });

const createProblem = async (payload) => {
  const slug = payload.slug || generateSlug(payload.title);
  const exists = await Problem.findOne({ slug });
  if (exists) throw new ApiError(409, "Problem slug already exists");

  return Problem.create({ ...payload, slug });
};

const updateProblem = async (problemId, payload) => {
  if (payload.title && !payload.slug) {
    payload.slug = generateSlug(payload.title);
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
