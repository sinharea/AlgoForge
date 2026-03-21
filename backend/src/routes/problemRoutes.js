const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { USER_ROLES } = require("../constants");
const {
  createProblemSchema,
  updateProblemSchema,
  problemQuerySchema,
} = require("../validators/problemValidator");
const {
  createProblem,
  deleteProblem,
  getAllProblems,
  getProblemById,
  getProblemBySlug,
  updateProblem,
} = require("../controllers/problemController");

router.get("/", validate(problemQuerySchema, "query"), getAllProblems);
router.get("/slug/:slug", getProblemBySlug);
router.get("/:id", getProblemById);

router.post(
  "/",
  auth,
  authorize(USER_ROLES.ADMIN),
  validate(createProblemSchema),
  createProblem
);
router.put(
  "/:id",
  auth,
  authorize(USER_ROLES.ADMIN),
  validate(updateProblemSchema),
  updateProblem
);
router.delete("/:id", auth, authorize(USER_ROLES.ADMIN), deleteProblem);

module.exports = router;
