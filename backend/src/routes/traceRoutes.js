const express = require("express");

const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { runLimiter } = require("../middleware/rateLimiter");
const { traceRequestSchema } = require("../validators/traceValidator");
const { traceCodeExecution } = require("../controllers/traceController");

const router = express.Router();

router.use(auth);
router.post("/", runLimiter, validate(traceRequestSchema), traceCodeExecution);

module.exports = router;
