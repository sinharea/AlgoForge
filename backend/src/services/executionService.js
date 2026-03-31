const { spawn } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");
const {
  executionEnabled,
  executionMode,
  codeExecApi,
  dockerCpuLimit,
  dockerMemoryLimit,
  dockerExecutionTimeoutMs,
  localExecutionTimeoutMs,
  nodeEnv,
} = require("../config/env");

// Maximum output size (64KB) to prevent memory exhaustion
const MAX_OUTPUT_SIZE = 65536;

// Truncate output to prevent memory issues
const truncateOutput = (str, maxLen = MAX_OUTPUT_SIZE) => {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + "\n... [output truncated]";
};

const dockerSpec = {
  python: { image: "python:3.12-alpine", file: "main.py", args: ["python3", "main.py"] },
  javascript: { image: "node:20-alpine", file: "main.js", args: ["node", "main.js"] },
  cpp: { image: "gcc:13", file: "main.cpp", args: ["sh", "-c", "g++ main.cpp -O2 -o main 2>&1 && ./main"] },
  java: { image: "openjdk:17-alpine", file: "Main.java", args: ["sh", "-c", "javac Main.java 2>&1 && java Main"] },
  go: { image: "golang:1.21-alpine", file: "main.go", args: ["go", "run", "main.go"] },
  rust: { image: "rust:1.74-alpine", file: "main.rs", args: ["sh", "-c", "rustc main.rs -o main 2>&1 && ./main"] },
  typescript: { image: "node:20-alpine", file: "main.ts", args: ["sh", "-c", "npx -y ts-node main.ts"] },
};

const localSpec = {
  python: { cmd: "python", file: "main.py", args: ["main.py"] },
  javascript: { cmd: "node", file: "main.js", args: ["main.js"] },
  cpp: { cmd: "g++", file: "main.cpp", compileArgs: ["main.cpp", "-O2", "-o", "main.exe"], runCmd: ".\\main.exe" },
  java: { cmd: "javac", file: "Main.java", compileArgs: ["Main.java"], runCmd: "java", runArgs: ["Main"] },
  go: { cmd: "go", file: "main.go", args: ["run", "main.go"] },
  rust: { cmd: "rustc", file: "main.rs", compileArgs: ["main.rs", "-o", "main.exe"], runCmd: ".\\main.exe" },
  typescript: { cmd: "npx", file: "main.ts", args: ["-y", "ts-node", "main.ts"] },
};

const normalize = (v = "") =>
  v.replace(/\r/g, "").trim().split("\n").map((line) => line.trim()).join("\n");

// Detect compilation errors from output
const isCompilationError = (stderr) => {
  if (!stderr) return false;
  const compileErrorPatterns = [
    /error:/i,
    /syntax error/i,
    /compilation failed/i,
    /cannot find symbol/i,
    /undefined reference/i,
    /expected/i,
    /^Main\.java:\d+:/m,
    /^main\.cpp:\d+:/m,
    /^main\.rs:\d+:/m,
  ];
  return compileErrorPatterns.some((pattern) => pattern.test(stderr));
};

// Detect timeout/TLE from error
const isTimeoutError = (error) => {
  return error.killed || error.signal === "SIGTERM" || error.signal === "SIGKILL" ||
         (error.message && error.message.includes("timeout"));
};

// Detect memory limit exceeded (OOM)
const isMemoryError = (error) => {
  return error.signal === "SIGKILL" ||
         (error.stderr && /out of memory|memory limit|oom/i.test(error.stderr)) ||
         (error.message && /out of memory|memory limit|oom/i.test(error.message));
};

const runCommand = ({ cmd, args = [], cwd, timeout, stdin = "" }) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const proc = spawn(cmd, args, { cwd, windowsHide: true });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, timeout);

    proc.stdout.on("data", (data) => {
      if (stdout.length < MAX_OUTPUT_SIZE) {
        stdout += data.toString();
      }
    });

    proc.stderr.on("data", (data) => {
      if (stderr.length < MAX_OUTPUT_SIZE) {
        stderr += data.toString();
      }
    });

    proc.on("error", (error) => {
      clearTimeout(timeoutId);
      resolve({
        stdout: "",
        stderr: truncateOutput(error.message),
        executionTime: Date.now() - startedAt,
        exitCode: 1,
        timedOut: false,
      });
    });

    proc.on("close", (exitCode) => {
      clearTimeout(timeoutId);
      resolve({
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(stderr),
        executionTime: Date.now() - startedAt,
        exitCode,
        timedOut,
      });
    });

    if (stdin) {
      proc.stdin.write(stdin);
    }
    proc.stdin.end();
  });

const runDocker = async ({ language, code, stdin = "" }) => {
  const spec = dockerSpec[language];
  if (!spec) throw new ApiError(400, "Unsupported language");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "af-exec-"));

  try {
    fs.writeFileSync(path.join(tempDir, spec.file), code, "utf8");

    // Hardened Docker arguments with security best practices
    const args = [
      "run",
      "--rm",
      // Resource limits
      "--cpus", dockerCpuLimit,
      "--memory", dockerMemoryLimit,
      "--memory-swap", dockerMemoryLimit, // Prevent swap usage
      "--pids-limit", "64", // Reduced from 128 for fork bomb protection
      // Security hardening
      "--security-opt=no-new-privileges",
      "--cap-drop=ALL",
      "--user", "65534:65534", // Run as nobody user
      "--read-only",
      "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
      // Network isolation - ALWAYS disabled, no conditional
      "--network", "none",
      // ulimits for additional protection
      "--ulimit", "nproc=64:64",
      "--ulimit", "fsize=10485760:10485760", // 10MB file size limit
      "--ulimit", "nofile=256:256",
      // Environment isolation - clear all env vars
      "--env", "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      // Workspace mounting
      "-v", `${tempDir}:/workspace:rw`,
      "-w", "/workspace",
      // Image and command
      spec.image,
      ...spec.args,
    ];

    const start = Date.now();

    // Use spawn for better control over stdin
    return new Promise((resolve) => {
      const proc = spawn("docker", args, {
        timeout: dockerExecutionTimeoutMs,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        if (stdout.length < MAX_OUTPUT_SIZE) {
          stdout += data.toString();
        }
      });

      proc.stderr.on("data", (data) => {
        if (stderr.length < MAX_OUTPUT_SIZE) {
          stderr += data.toString();
        }
      });

      if (stdin) {
        proc.stdin.write(stdin);
      }
      proc.stdin.end();

      const timeoutId = setTimeout(() => {
        proc.kill("SIGKILL");
      }, dockerExecutionTimeoutMs);

      proc.on("close", (code, signal) => {
        clearTimeout(timeoutId);
        const executionTime = Date.now() - start;

        stdout = truncateOutput(stdout);
        stderr = truncateOutput(stderr);

        if (signal === "SIGKILL" || signal === "SIGTERM") {
          resolve({
            stdout,
            stderr: stderr || "Time Limit Exceeded",
            executionTime,
            timedOut: true,
          });
        } else {
          resolve({
            stdout,
            stderr,
            executionTime,
            exitCode: code,
          });
        }
      });

      proc.on("error", (error) => {
        clearTimeout(timeoutId);
        logger.error("Docker execution error", { error: error.message });
        resolve({
          stdout: "",
          stderr: error.message,
          executionTime: Date.now() - start,
        });
      });
    });
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      logger.warn("Failed to cleanup temp directory", { dir: tempDir, error: cleanupErr.message });
    }
  }
};

const runLocal = async ({ language, code, stdin = "" }) => {
  // SECURITY: Only allow in development mode with explicit warning
  if (nodeEnv === "production") {
    throw new ApiError(403, "Local execution is disabled in production for security reasons");
  }

  logger.warn("Running code in LOCAL mode - NO SANDBOXING! Use only for development.");

  const spec = localSpec[language];
  if (!spec) throw new ApiError(400, "Unsupported language");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "af-local-"));
  const start = Date.now();

  try {
    fs.writeFileSync(path.join(tempDir, spec.file), code, "utf8");

    // Handle compiled languages: cpp, java, rust
    if (spec.compileArgs) {
      const compileResult = await runCommand({
        cmd: spec.cmd,
        args: spec.compileArgs,
        cwd: tempDir,
        timeout: localExecutionTimeoutMs,
      });

      if (compileResult.timedOut) {
        return {
          stdout: "",
          stderr: "Compilation timed out",
          executionTime: compileResult.executionTime,
          compilationError: true,
        };
      }

      if (compileResult.exitCode !== 0 || compileResult.stderr) {
        return {
          stdout: "",
          stderr: compileResult.stderr || "Compilation failed",
          executionTime: compileResult.executionTime,
          compilationError: true,
        };
      }

      // Java needs special handling (java Main instead of ./main.exe)
      if (language === "java") {
        const run = await runCommand({
          cmd: spec.runCmd,
          args: spec.runArgs,
          cwd: tempDir,
          timeout: localExecutionTimeoutMs,
          stdin,
        });

        if (run.timedOut) {
          return {
            stdout: truncateOutput(run.stdout),
            stderr: "Time Limit Exceeded",
            executionTime: run.executionTime,
            timedOut: true,
            exitCode: run.exitCode,
          };
        }

        return {
          stdout: run.stdout,
          stderr: run.stderr,
          executionTime: Date.now() - start,
          exitCode: run.exitCode,
        };
      }

      // C++ and Rust use cmd /c to run the executable
      const run = await runCommand({
        cmd: "cmd",
        args: ["/c", spec.runCmd],
        cwd: tempDir,
        timeout: localExecutionTimeoutMs,
        stdin,
      });

      if (run.timedOut) {
        return {
          stdout: truncateOutput(run.stdout),
          stderr: "Time Limit Exceeded",
          executionTime: run.executionTime,
          timedOut: true,
          exitCode: run.exitCode,
        };
      }

      return {
        stdout: run.stdout,
        stderr: run.stderr,
        executionTime: Date.now() - start,
        exitCode: run.exitCode,
      };
    }

    // Interpreted languages: python, javascript, go, typescript
    const result = await runCommand({
      cmd: spec.cmd,
      args: spec.args,
      cwd: tempDir,
      timeout: localExecutionTimeoutMs,
      stdin,
    });

    if (result.timedOut) {
      return {
        stdout: truncateOutput(result.stdout),
        stderr: "Time Limit Exceeded",
        executionTime: result.executionTime,
        timedOut: true,
        exitCode: result.exitCode,
      };
    }

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      executionTime: Date.now() - start,
      exitCode: result.exitCode,
    };
  } catch (error) {
    const executionTime = Date.now() - start;
    if (isTimeoutError(error)) {
      return {
        stdout: truncateOutput(error.stdout),
        stderr: "Time Limit Exceeded",
        executionTime,
        timedOut: true,
      };
    }
    return {
      stdout: truncateOutput(error.stdout),
      stderr: truncateOutput(error.stderr || error.message),
      executionTime,
      exitCode: error.code || 1,
    };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      logger.warn("Failed to cleanup temp directory", { dir: tempDir });
    }
  }
};

const runApi = async ({ language, code, stdin = "" }) => {
  const start = Date.now();
  try {
    const { data } = await axios.post(
      `${codeExecApi}/execute`,
      { language, code, stdin },
      { timeout: dockerExecutionTimeoutMs + 2000 }
    );
    return {
      stdout: truncateOutput(data.stdout),
      stderr: truncateOutput(data.stderr),
      executionTime: Date.now() - start,
    };
  } catch (error) {
    logger.error("API execution failed", { error: error.message });
    return {
      stdout: "",
      stderr: error.response?.data?.error || error.message,
      executionTime: Date.now() - start,
    };
  }
};

const execute = async ({ language, code, stdin }) => {
  if (!executionEnabled) {
    return { stdout: "", stderr: "Execution disabled", executionTime: 0 };
  }

  if (executionMode === "docker") return runDocker({ language, code, stdin });
  if (executionMode === "api") return runApi({ language, code, stdin });
  if (executionMode === "local") return runLocal({ language, code, stdin });

  throw new ApiError(400, "Invalid EXECUTION_MODE");
};

const judgeSubmission = async ({ language, code, testCases = [], timeLimit = 2000, memoryLimit = 256 }) => {
  let totalRuntime = 0;
  let passedCount = 0;
  let lastStdout = "";

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const result = await execute({ language, code, stdin: testCase.input || "" });
    totalRuntime += result.executionTime;
    lastStdout = result.stdout || "";

    // Check for timeout (TLE)
    if (result.timedOut) {
      return {
        verdict: "Time Limit Exceeded",
        runtime: totalRuntime,
        passedCount,
        totalCount: testCases.length,
        stdout: truncateOutput(result.stdout),
        stderr: "Execution exceeded time limit",
        compileOutput: "",
        failedTestCase: i + 1,
      };
    }

    // Check for compilation error
    if (result.compilationError || isCompilationError(result.stderr)) {
      return {
        verdict: "Compilation Error",
        runtime: totalRuntime,
        passedCount: 0,
        totalCount: testCases.length,
        stdout: "",
        stderr: truncateOutput(result.stderr),
        compileOutput: truncateOutput(result.stderr),
        failedTestCase: 0,
      };
    }

    // Check for runtime error
    if (result.stderr && result.exitCode !== 0) {
      return {
        verdict: "Runtime Error",
        runtime: totalRuntime,
        passedCount,
        totalCount: testCases.length,
        stdout: truncateOutput(result.stdout),
        stderr: truncateOutput(result.stderr),
        compileOutput: "",
        failedTestCase: i + 1,
      };
    }

    // Check for wrong answer
    if (normalize(result.stdout) !== normalize(testCase.expectedOutput || "")) {
      return {
        verdict: "Wrong Answer",
        runtime: totalRuntime,
        passedCount,
        totalCount: testCases.length,
        stdout: truncateOutput(result.stdout),
        stderr: "",
        compileOutput: "",
        failedTestCase: i + 1,
        expectedOutput: truncateOutput(testCase.expectedOutput || ""),
        actualOutput: truncateOutput(result.stdout),
      };
    }

    passedCount += 1;
  }

  return {
    verdict: "Accepted",
    runtime: totalRuntime,
    passedCount,
    totalCount: testCases.length,
    stdout: truncateOutput(lastStdout),
    stderr: "",
    compileOutput: "",
  };
};

module.exports = {
  execute,
  judgeSubmission,
  runDocker,
  runLocal,
  runApi,
  normalize,
  truncateOutput,
  MAX_OUTPUT_SIZE,
};
