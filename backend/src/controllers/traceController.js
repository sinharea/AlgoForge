const asyncHandler = require("../utils/asyncHandler");
const { traceExecution } = require("../services/traceService");

const traceCodeExecution = asyncHandler(async (req, res) => {
  const { code, input = "", language } = req.body;
  const steps = await traceExecution({ code, input, language });
  res.json(steps);
});

module.exports = {
  traceCodeExecution,
};
