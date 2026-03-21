const { execFile } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { promisify } = require("util");
const { randomUUID } = require("crypto");
const ApiError = require("../utils/apiError");
const {
  dockerCpuLimit,
  dockerMemoryLimit,
  dockerNetworkDisabled,
  dockerExecutionTimeoutMs,
} = require("../config/env");

const execFileAsync = promisify(execFile);

const languageMap = {
  cpp: { image: "gcc:13", fileName: "Main.cpp", run: "g++ Main.cpp -O2 -o main && ./main" },
  python: { image: "python:3.12-alpine", fileName: "main.py", run: "python3 main.py" },
  javascript: { image: "node:20-alpine", fileName: "main.js", run: "node main.js" },
  java: { image: "eclipse-temurin:21", fileName: "Main.java", run: "javac Main.java && java Main" },
};

const normalize = (v = "") =>
  v
    .replace(/\r/g, "")
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

const runDocker = async ({ language, code, stdin = "" }) => {
  const spec = languageMap[language];
  if (!spec) throw new ApiError(400, "Unsupported language");

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "algoforge-"));
  const codePath = path.join(tempRoot, spec.fileName);
  const stdinPath = path.join(tempRoot, "stdin.txt");

  fs.writeFileSync(codePath, code, "utf8");
  fs.writeFileSync(stdinPath, stdin, "utf8");

  const dockerArgs = [
    "run",
    "--rm",
    "--cpus",
    dockerCpuLimit,
    "--memory",
    dockerMemoryLimit,
    "--read-only",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=64m",
    "--pids-limit",
    "128",
    ...(dockerNetworkDisabled ? ["--network", "none"] : []),
    "-v",
    `${tempRoot}:/workspace:ro`,
    "-w",
    "/workspace",
    spec.image,
    "sh",
    "-lc",
    `${spec.run} < stdin.txt`,
  ];

  const startedAt = Date.now();
  let stdout = "";
  let stderr = "";

  try {
    const result = await execFileAsync("docker", dockerArgs, {
      timeout: dockerExecutionTimeoutMs,
      maxBuffer: 1024 * 1024,
    });
    stdout = result.stdout || "";
    stderr = result.stderr || "";
  } catch (error) {
    if (error.killed || error.signal === "SIGTERM") {
      throw new ApiError(408, "Execution timeout");
    }
    stdout = error.stdout || "";
    stderr = error.stderr || error.message;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  return {
    stdout,
    stderr,
    compileOutput: "",
    executionTime: Date.now() - startedAt,
  };
};

const judgeSubmission = async ({ language, code, testCases = [] }) => {
  let totalRuntime = 0;
  let passedCount = 0;
  let finalOutput = { stdout: "", stderr: "", compileOutput: "" };

  for (const testCase of testCases) {
    const execution = await runDocker({
      language,
      code,
      stdin: testCase.input || "",
    });
    totalRuntime += execution.executionTime;
    finalOutput = execution;

    if (execution.stderr) {
      return {
        verdict: execution.stderr.toLowerCase().includes("error")
          ? "Runtime Error"
          : "Runtime Error",
        runtime: totalRuntime,
        passedCount,
        totalCount: testCases.length,
        ...execution,
      };
    }

    if (normalize(execution.stdout) !== normalize(testCase.expectedOutput || "")) {
      return {
        verdict: "Wrong Answer",
        runtime: totalRuntime,
        passedCount,
        totalCount: testCases.length,
        ...execution,
      };
    }

    passedCount += 1;
  }

  return {
    verdict: "Accepted",
    runtime: totalRuntime,
    passedCount,
    totalCount: testCases.length,
    ...finalOutput,
  };
};

module.exports = {
  runDocker,
  judgeSubmission,
  executionJobVersion: randomUUID(),
};
