const express = require("express");
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { USER_ROLES } = require("../constants");
const { createContestSchema, updateContestSchema } = require("../validators/contestValidator");
const {
  createContest,
  updateContest,
  listContests,
  getContestById,
  registerForContest,
  getLeaderboard,
  processRatings,
  getUserRatings,
  getRatingsLeaderboard,
} = require("../controllers/contestController");

const router = express.Router();

// Rating endpoints
router.get("/ratings/leaderboard", getRatingsLeaderboard);
router.get("/ratings/me", auth, getUserRatings);
router.get("/ratings/:userId", auth, getUserRatings);

// Contest CRUD
router.get("/", listContests);
router.post("/", auth, authorize(USER_ROLES.ADMIN), validate(createContestSchema), createContest);
router.get("/:id", auth, getContestById);
router.put("/:id", auth, authorize(USER_ROLES.ADMIN), validate(updateContestSchema), updateContest);
router.post("/:id/register", auth, registerForContest);
router.get("/:id/leaderboard", auth, getLeaderboard);
router.post("/:id/process-ratings", auth, authorize(USER_ROLES.ADMIN), processRatings);

module.exports = router;
