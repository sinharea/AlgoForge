const express = require("express");
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { USER_ROLES } = require("../constants");
const { createContestSchema } = require("../validators/contestValidator");
const {
  createContest,
  listContests,
  registerForContest,
  getLeaderboard,
  processRatings,
  getUserRatings,
  getRatingsLeaderboard,
} = require("../controllers/contestController");

const router = express.Router();

// Contest CRUD
router.get("/", listContests);
router.post("/", auth, authorize(USER_ROLES.ADMIN), validate(createContestSchema), createContest);
router.post("/:id/register", auth, registerForContest);
router.get("/:id/leaderboard", auth, getLeaderboard);

// Rating endpoints
router.post("/:id/process-ratings", auth, authorize(USER_ROLES.ADMIN), processRatings);
router.get("/ratings/leaderboard", getRatingsLeaderboard);
router.get("/ratings/me", auth, getUserRatings);
router.get("/ratings/:userId", auth, getUserRatings);

module.exports = router;
