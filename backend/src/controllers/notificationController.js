const asyncHandler = require("../utils/asyncHandler");
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
} = require("../services/notificationService");

const getNotifications = asyncHandler(async (req, res) => {
  const payload = await getUserNotifications({
    userId: req.user._id,
    page: req.query.page,
    limit: req.query.limit,
    unreadOnly: req.query.unreadOnly === "true",
  });
  res.json(payload);
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await markAsRead({
    userId: req.user._id,
    notificationId: req.params.id,
  });
  res.json(notification);
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await markAllAsRead({ userId: req.user._id });
  res.json(result);
});

const getUnread = asyncHandler(async (req, res) => {
  const result = await getUnreadCount({ userId: req.user._id });
  res.json(result);
});

const removeNotification = asyncHandler(async (req, res) => {
  const result = await deleteNotification({
    userId: req.user._id,
    notificationId: req.params.id,
  });
  res.json(result);
});

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllRead,
  getUnread,
  removeNotification,
};
