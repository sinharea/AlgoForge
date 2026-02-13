const express = require("express");
const router = express.Router();
const Problem = require("../models/Problem");

const auth = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");


/*
  CREATE PROBLEM (Admin Only)
*/
router.post("/create", auth, adminMiddleware, async (req, res) => {
  try {
    const problem = new Problem(req.body);
    await problem.save();

    res.status(201).json(problem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/*
  GET ALL PROBLEMS (Public)
  IMPORTANT:
  - Do NOT send hiddenTestCases
*/
router.get("/", async (req, res) => {
  try {
    const problems = await Problem.find().select(
      "title slug difficulty"
    );

    res.json(problems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/*
  GET SINGLE PROBLEM (Public)
  IMPORTANT:
  - Send sampleTestCases
  - Do NOT send hiddenTestCases
*/

router.get("/slug/:slug", async (req, res) => {

    console.log("Backend hit: slug =", req.params.slug);


  try {
    const problem = await Problem.findOne({ slug: req.params.slug })
      .select("-hiddenTestCases");

    if (!problem) {
      return res.status(404).json({ message: "this is Problem not found" });
    }

    res.json(problem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id).select(
      "title slug description difficulty constraints tags sampleTestCases timeLimit memoryLimit"
    );

    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.json(problem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/*
  UPDATE PROBLEM (Admin Only)
*/
router.put("/:id", auth, adminMiddleware, async (req, res) => {
  try {
    const updatedProblem = await Problem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedProblem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.json(updatedProblem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/*
  DELETE PROBLEM (Admin Only)
*/
router.delete("/:id", auth, adminMiddleware, async (req, res) => {
  try {
    const deletedProblem = await Problem.findByIdAndDelete(req.params.id);

    if (!deletedProblem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.json({ message: "Problem deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
