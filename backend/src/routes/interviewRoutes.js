const express = require("express");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  startInterviewSchema,
  respondInterviewSchema,
  interviewSessionParamsSchema,
} = require("../validators/interviewValidator");
const {
  startInterview,
  respondInterview,
  getInterviewById,
} = require("../controllers/interviewController");

const router = express.Router();

router.use(auth);

router.post("/start", validate(startInterviewSchema), startInterview);
router.post("/respond", validate(respondInterviewSchema), respondInterview);
router.get("/:sessionId", validate(interviewSessionParamsSchema, "params"), getInterviewById);

module.exports = router;
