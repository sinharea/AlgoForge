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
} = require("../controllers/contestController");

const router = express.Router();

router.get("/", listContests);
router.post("/", auth, authorize(USER_ROLES.ADMIN), validate(createContestSchema), createContest);
router.post("/:id/register", auth, registerForContest);
router.get("/:id/leaderboard", auth, getLeaderboard);

module.exports = router;
