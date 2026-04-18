const express = require("express");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  startInterviewSchema,
  respondInterviewSchema,
  compareInterviewComplexitySchema,
  interviewSessionParamsSchema,
  interviewMessagesQuerySchema,
  endInterviewSchema,
  saveCodeSnapshotSchema,
  interviewHistoryQuerySchema,
} = require("../validators/interviewValidator");
const {
  startInterview,
  respondInterview,
  compareInterviewComplexity,
  getInterviewById,
  getInterviewMessages,
  endInterview,
  saveCode,
  getHistory,
  getStats,
} = require("../controllers/interviewController");

const router = express.Router();

router.use(auth);

router.post("/start", validate(startInterviewSchema), startInterview);
router.post("/respond", validate(respondInterviewSchema), respondInterview);
router.post("/compare", validate(compareInterviewComplexitySchema), compareInterviewComplexity);
router.post("/end", validate(endInterviewSchema), endInterview);
router.post("/code-snapshot", validate(saveCodeSnapshotSchema), saveCode);
router.get("/history", validate(interviewHistoryQuerySchema, "query"), getHistory);
router.get("/stats", getStats);
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
