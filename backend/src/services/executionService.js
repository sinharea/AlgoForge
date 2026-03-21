const axios = require("axios");
const { executionApiUrl, executionApiKey } = require("../config/env");
const ApiError = require("../utils/apiError");

const normalizeOutput = (value = "") =>
  value
    .replace(/\r/g, "")
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

const executeCode = async ({ language, code, stdin }) => {
  if (!executionApiUrl) {
    throw new ApiError(500, "Execution API is not configured");
  }

  const response = await axios.post(
    executionApiUrl,
    { language, code, stdin },
    {
      headers: executionApiKey
        ? { Authorization: `Bearer ${executionApiKey}` }
        : undefined,
      timeout: 15000,
    }
  );

  return {
    stdout: response.data.stdout || "",
    stderr: response.data.stderr || "",
    compileOutput: response.data.compileOutput || "",
    executionTime: Number(response.data.executionTime || 0),
  };
};

const judgeSubmission = async ({ language, code, testCases = [] }) => {
  let totalRuntime = 0;
  let passed = 0;
  let final = {
    stdout: "",
    stderr: "",
    compileOutput: "",
  };

  for (const testCase of testCases) {
    const result = await executeCode({
      language,
      code,
      stdin: testCase.input || "",
    });
    totalRuntime += result.executionTime;
    final = result;

    if (result.compileOutput) {
      return {
        verdict: "Compilation Error",
        runtime: totalRuntime,
        passedCount: passed,
        totalCount: testCases.length,
        ...result,
      };
    }

    if (result.stderr) {
      return {
        verdict: "Runtime Error",
        runtime: totalRuntime,
        passedCount: passed,
        totalCount: testCases.length,
        ...result,
      };
    }

    const output = normalizeOutput(result.stdout);
    const expected = normalizeOutput(testCase.expectedOutput || "");
    if (output !== expected) {
      return {
        verdict: "Wrong Answer",
        runtime: totalRuntime,
        passedCount: passed,
        totalCount: testCases.length,
        ...result,
      };
    }

    passed += 1;
  }

  return {
    verdict: "Accepted",
    runtime: totalRuntime,
    passedCount: passed,
    totalCount: testCases.length,
    ...final,
  };
};

module.exports = {
  executeCode,
  judgeSubmission,
};
