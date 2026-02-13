const Problem = require("../models/Problem");

/*
  GET ALL PROBLEMS
  Used for Problems List page
  Only send minimal required fields
*/
exports.getAllProblems = async (req, res) => {
  try {
    const problems = await Problem.find().select(
      "title slug difficulty"
    );

    res.json(problems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


/*
  GET SINGLE PROBLEM
  Used for Problem Detail page
  IMPORTANT:
  - Send sampleTestCases
  - DO NOT send hiddenTestCases
*/
exports.getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id).select(
      "title slug description difficulty constraints tags sampleTestCases timeLimit memoryLimit"
    );

    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.json(problem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
