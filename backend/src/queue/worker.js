const submissionQueue = require("./submissionQueue");
const Submission = require("../models/Submission");
const mongoose = require("mongoose");
const fs = require("fs");
const { exec, spawn } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
require("dotenv").config();

console.log("Worker starting...");

// Mongo connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Worker MongoDB Connected"))
  .catch(err => console.error("Worker DB Error:", err));

// Queue connection debug
submissionQueue.on("ready", () => {
  console.log("Queue is ready and connected to Redis");
});

submissionQueue.on("error", (err) => {
  console.error("Queue error:", err);
});

const normalize = (str) => {
  return str
    .replace(/\r/g, "")
    .trim()
    .split("\n")
    .map(line => line.trim())
    .join("\n");
};

submissionQueue.process(async (job) => {

  console.log("Job received from queue");

  const { submissionId } = job.data;
  console.log("Processing submission:", submissionId);

  const submission = await Submission.findById(submissionId)
    .populate("problemId");

  if (!submission) {
    console.log("Submission not found");
    return;
  }

  const problem = submission.problemId;

  if (!problem || !problem.hiddenTestCases?.length) {
    await Submission.findByIdAndUpdate(submissionId, {
      verdict: "Problem Error"
    });
    console.log("No hidden test cases found");
    return;
  }

  let verdict = "Accepted";
  let runtime = 0;

  const tempDir = path.join(__dirname, "../../temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const fileId = uuidv4();
  const cppFilePath = path.join(tempDir, `${fileId}.cpp`);
  const exeFilePath = path.join(tempDir, `${fileId}.exe`);

  try {

    // Write user code
    fs.writeFileSync(cppFilePath, submission.code);

    // Compile
    await new Promise((resolve, reject) => {
      exec(`g++ "${cppFilePath}" -o "${exeFilePath}"`, (err, stdout, stderr) => {
        if (err) {
          verdict = "Compilation Error";
          console.log("Compilation error:", stderr);
          return reject(err);
        }
        resolve();
      });
    });

    // Run hidden test cases
    for (let testCase of problem.hiddenTestCases) {

      const input = testCase.input;
      const expectedOutput = testCase.expectedOutput;

      const start = Date.now();

      const output = await new Promise((resolve, reject) => {

        const child = spawn(exeFilePath, [], {
          stdio: ["pipe", "pipe", "pipe"]
        });

        let result = "";
        let errorOutput = "";

        const timer = setTimeout(() => {
          child.kill();
          verdict = "Time Limit Exceeded";
          reject(new Error("TLE"));
        }, problem.timeLimit || 2000);

        child.stdout.on("data", (data) => {
          result += data.toString();
        });

        child.stderr.on("data", (data) => {
          errorOutput += data.toString();
        });

        child.on("close", (code) => {
          clearTimeout(timer);

          if (code !== 0) {
            verdict = "Runtime Error";
            return reject(new Error(errorOutput));
          }

          resolve(result);
        });

        child.stdin.write(input + "\n");
        child.stdin.end();
      });

      const end = Date.now();
      runtime += end - start;

      const normalizedOutput = normalize(output);
      const normalizedExpected = normalize(expectedOutput);

      console.log("Expected:", JSON.stringify(normalizedExpected));
      console.log("Got:", JSON.stringify(normalizedOutput));

      if (normalizedOutput !== normalizedExpected) {
        verdict = "Wrong Answer";
        break;
      }
    }

  } catch (err) {
    console.log("Execution error:", err);

    if (
      verdict !== "Wrong Answer" &&
      verdict !== "Compilation Error" &&
      verdict !== "Time Limit Exceeded"
    ) {
      verdict = "Runtime Error";
    }
  } finally {

    if (fs.existsSync(cppFilePath)) fs.unlinkSync(cppFilePath);
    if (fs.existsSync(exeFilePath)) fs.unlinkSync(exeFilePath);
  }

  await Submission.findByIdAndUpdate(submissionId, {
    verdict,
    runtime,
    memory: 0
  });

  console.log("Submission evaluated:", verdict);
});
