const express = require("express");
const auth = require("../middleware/auth");
const {
  getNotifications,
  markNotificationRead,
  markAllRead,
  getUnread,
  removeNotification,
} = require("../controllers/notificationController");

const router = express.Router();

router.use(auth);

router.get("/", getNotifications);
router.get("/unread-count", getUnread);
router.put("/read-all", markAllRead);
router.put("/:id/read", markNotificationRead);
router.delete("/:id", removeNotification);

module.exports = router;
