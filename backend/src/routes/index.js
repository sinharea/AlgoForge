const express = require("express");

const authRoutes = require("./authRoutes");
const problemRoutes = require("./problemRoutes");
const submissionRoutes = require("./submissionRoutes");
const contestRoutes = require("./contestRoutes");
const recommendationRoutes = require("./recommendationRoutes");
const communityRoutes = require("./communityRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/problems", problemRoutes);
router.use("/submissions", submissionRoutes);
router.use("/contests", contestRoutes);
router.use("/recommendations", recommendationRoutes);
router.use("/", communityRoutes);

module.exports = router;
