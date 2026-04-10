const express = require("express");
const auth = require("../middleware/auth");
const { getWeakness } = require("../controllers/userController");

const router = express.Router();

router.get("/weakness", auth, getWeakness);

module.exports = router;