const express = require("express");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  startInterviewSchema,
  respondInterviewSchema,
  compareInterviewComplexitySchema,
  interviewSessionParamsSchema,
  interviewMessagesQuerySchema,
} = require("../validators/interviewValidator");
const {
  startInterview,
  respondInterview,
  compareInterviewComplexity,
  getInterviewById,
  getInterviewMessages,
} = require("../controllers/interviewController");

const router = express.Router();

router.use(auth);

router.post("/start", validate(startInterviewSchema), startInterview);
router.post("/respond", validate(respondInterviewSchema), respondInterview);
router.post("/compare", validate(compareInterviewComplexitySchema), compareInterviewComplexity);
router.get(
  "/:sessionId/messages",
  validate(interviewSessionParamsSchema, "params"),
  validate(interviewMessagesQuerySchema, "query"),
  getInterviewMessages
);
router.get(
  "/:sessionId",
  validate(interviewSessionParamsSchema, "params"),
  validate(interviewMessagesQuerySchema, "query"),
  getInterviewById
);

module.exports = router;
