const express = require("express");

const authRoutes = require("./authRoutes");
const problemRoutes = require("./problemRoutes");
const submissionRoutes = require("./submissionRoutes");
const contestRoutes = require("./contestRoutes");
const recommendationRoutes = require("./recommendationRoutes");
const communityRoutes = require("./communityRoutes");
const adminRoutes = require("./adminRoutes");
const userRoutes = require("./userRoutes");
const interviewRoutes = require("./interviewRoutes");
const traceRoutes = require("./traceRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/problems", problemRoutes);
router.use("/submissions", submissionRoutes);
router.use("/submission", submissionRoutes);
router.use("/contests", contestRoutes);
router.use("/recommendations", recommendationRoutes);
router.use("/", communityRoutes);
router.use("/admin", adminRoutes);
router.use("/user", userRoutes);
router.use("/interview", interviewRoutes);
router.use("/trace", traceRoutes);

module.exports = router;
