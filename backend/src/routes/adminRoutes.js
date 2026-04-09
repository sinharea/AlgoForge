const express = require("express");
const validate = require("../middleware/validate");
const verifyJWT = require("../middleware/verifyJWT");
const checkAdminRole = require("../middleware/checkAdminRole");
const { uploadTestcases } = require("../middleware/uploadTestcases");
const {
  adminProblemCreateSchema,
  adminProblemUpdateSchema,
  adminProblemIdParamsSchema,
  adminContestCreateSchema,
  adminContestUpdateSchema,
  adminUserQuerySchema,
  adminToggleBanSchema,
  adminReportQuerySchema,
  adminReportActionSchema,
} = require("../validators/adminValidator");
const {
  createProblem,
  updateProblem,
  deleteProblem,
  createTestcases,
  createContest,
  updateContest,
  deleteContest,
  getUsers,
  banUser,
  unbanUser,
  getReports,
  reportAction,
  getAnalytics,
} = require("../controllers/adminController");

const router = express.Router();

router.use(verifyJWT, checkAdminRole);

router.post("/problem", validate(adminProblemCreateSchema), createProblem);
router.put("/problem/:id", validate(adminProblemIdParamsSchema, "params"), validate(adminProblemUpdateSchema), updateProblem);
router.delete("/problem/:id", validate(adminProblemIdParamsSchema, "params"), deleteProblem);

router.post(
  "/testcases",
  uploadTestcases.fields([
    { name: "inputFiles", maxCount: 20 },
    { name: "outputFiles", maxCount: 20 },
  ]),
  createTestcases
);

router.post("/contest", validate(adminContestCreateSchema), createContest);
router.put("/contest/:id", validate(adminProblemIdParamsSchema, "params"), validate(adminContestUpdateSchema), updateContest);
router.delete("/contest/:id", validate(adminProblemIdParamsSchema, "params"), deleteContest);

router.get("/users", validate(adminUserQuerySchema, "query"), getUsers);
router.post("/ban-user", validate(adminToggleBanSchema), banUser);
router.post("/unban-user", validate(adminToggleBanSchema), unbanUser);

router.get("/reports", validate(adminReportQuerySchema, "query"), getReports);
router.post("/report/action", validate(adminReportActionSchema), reportAction);

router.get("/analytics", getAnalytics);

module.exports = router;
