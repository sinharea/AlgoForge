const express = require("express");

const authRoutes = require("./authRoutes");
const problemRoutes = require("./problemRoutes");
const submissionRoutes = require("./submissionRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/problems", problemRoutes);
router.use("/submissions", submissionRoutes);

module.exports = router;
