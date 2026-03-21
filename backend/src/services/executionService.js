const { execFile } = require("child_process");
const { promisify } = require("util");
const os = require("os");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const ApiError = require("../utils/apiError");
const {
  executionEnabled,
  executionMode,
  codeExecApi,
  dockerCpuLimit,
  dockerMemoryLimit,
  dockerNetworkDisabled,
  dockerExecutionTimeoutMs,
  localExecutionTimeoutMs,
  nodeEnv,
} = require("../config/env");

const execFileAsync = promisify(execFile);

const dockerSpec = {
  python: { image: "python:3.12-alpine", file: "main.py", args: ["python3", "main.py"] },
  javascript: { image: "node:20-alpine", file: "main.js", args: ["node", "main.js"] },
  cpp: { image: "gcc:13", file: "main.cpp", args: ["sh", "-lc", "g++ main.cpp -O2 -o main && ./main"] },
};

const localSpec = {
  python: { cmd: "python", file: "main.py", args: ["main.py"] },
  javascript: { cmd: "node", file: "main.js", args: ["main.js"] },
  cpp: { cmd: "g++", file: "main.cpp", compileArgs: ["main.cpp", "-O2", "-o", "main.exe"], runCmd: ".\\main.exe" },
};

const normalize = (v = "") =>
  v.replace(/\r/g, "").trim().split("\n").map((line) => line.trim()).join("\n");

const runDocker = async ({ language, code, stdin = "" }) => {
  const spec = dockerSpec[language];
  if (!spec) throw new ApiError(400, "Unsupported language");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "af-exec-"));
  try {
    fs.writeFileSync(path.join(tempDir, spec.file), code, "utf8");
    const args = [
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
      `${tempDir}:/workspace:rw`,
      "-w",
      "/workspace",
      spec.image,
      ...spec.args,
    ];
    const start = Date.now();
    const result = await execFileAsync("docker", args, {
      timeout: dockerExecutionTimeoutMs,
      maxBuffer: 1024 * 1024,
      input: stdin,
    });
    return { stdout: result.stdout || "", stderr: result.stderr || "", executionTime: Date.now() - start };
  } catch (error) {
    if (error.killed || error.signal === "SIGTERM") throw new ApiError(408, "Execution timeout");
    return { stdout: error.stdout || "", stderr: error.stderr || error.message, executionTime: dockerExecutionTimeoutMs };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

const runLocal = async ({ language, code, stdin = "" }) => {
  if (nodeEnv === "production") throw new ApiError(403, "Local execution is disabled in production");
  const spec = localSpec[language];
  if (!spec) throw new ApiError(400, "Unsupported language");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "af-local-"));
  try {
    fs.writeFileSync(path.join(tempDir, spec.file), code, "utf8");
    const start = Date.now();

    if (language === "cpp") {
      await execFileAsync(spec.cmd, spec.compileArgs, { cwd: tempDir, timeout: localExecutionTimeoutMs });
      const run = await execFileAsync("cmd", ["/c", spec.runCmd], {
        cwd: tempDir,
        timeout: localExecutionTimeoutMs,
        input: stdin,
        maxBuffer: 1024 * 1024,
      });
      return { stdout: run.stdout || "", stderr: run.stderr || "", executionTime: Date.now() - start };
    }

    const result = await execFileAsync(spec.cmd, spec.args, {
      cwd: tempDir,
      timeout: localExecutionTimeoutMs,
      input: stdin,
      maxBuffer: 1024 * 1024,
    });
    return { stdout: result.stdout || "", stderr: result.stderr || "", executionTime: Date.now() - start };
  } catch (error) {
    if (error.killed || error.signal === "SIGTERM") throw new ApiError(408, "Execution timeout");
    return { stdout: error.stdout || "", stderr: error.stderr || error.message, executionTime: localExecutionTimeoutMs };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

const runApi = async ({ language, code, stdin = "" }) => {
  const start = Date.now();
  const { data } = await axios.post(`${codeExecApi}/execute`, { language, code, stdin }, { timeout: dockerExecutionTimeoutMs });
  return { stdout: data.stdout || "", stderr: data.stderr || "", executionTime: Date.now() - start };
};

const execute = async ({ language, code, stdin }) => {
  if (!executionEnabled) return { stdout: "", stderr: "Execution disabled", executionTime: 0 };
  if (executionMode === "docker") return runDocker({ language, code, stdin });
  if (executionMode === "api") return runApi({ language, code, stdin });
  if (executionMode === "local") return runLocal({ language, code, stdin });
  throw new ApiError(400, "Invalid EXECUTION_MODE");
};

const judgeSubmission = async ({ language, code, testCases = [] }) => {
  let totalRuntime = 0;
  let passedCount = 0;
  let lastStdout = "";
  for (const testCase of testCases) {
    const result = await execute({ language, code, stdin: testCase.input || "" });
    totalRuntime += result.executionTime;
    lastStdout = result.stdout || "";
    if (result.stderr) {
      return {
        verdict: "Runtime Error",
        runtime: totalRuntime,
        passedCount,
        totalCount: testCases.length,
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        compileOutput: "",
      };
    }
    if (normalize(result.stdout) !== normalize(testCase.expectedOutput || "")) {
      return {
        verdict: "Wrong Answer",
        runtime: totalRuntime,
        passedCount,
        totalCount: testCases.length,
        stdout: result.stdout || "",
        stderr: "",
        compileOutput: "",
      };
    }
    passedCount += 1;
  }
  return {
    verdict: "Accepted",
    runtime: totalRuntime,
    passedCount,
    totalCount: testCases.length,
    stdout: lastStdout,
    stderr: "",
    compileOutput: "",
  };
};

module.exports = { execute, judgeSubmission, runDocker, runLocal, runApi };
