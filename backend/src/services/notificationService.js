const Notification = require("../models/Notification");
const ApiError = require("../utils/apiError");

const DEFAULT_LIMIT = 20;

const createNotification = async ({ userId, type, title, message, link = "", metadata = {} }) => {
  return Notification.create({ userId, type, title, message, link, metadata });
};

const createBulkNotifications = async (notifications) => {
  if (!notifications.length) return [];
  return Notification.insertMany(notifications);
};

const getUserNotifications = async ({ userId, page = 1, limit = DEFAULT_LIMIT, unreadOnly = false }) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || DEFAULT_LIMIT));
  const skip = (safePage - 1) * safeLimit;

  const filter = { userId };
  if (unreadOnly) filter.isRead = false;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return {
    items,
    total,
    unreadCount,
    page: safePage,
    pages: Math.max(1, Math.ceil(total / safeLimit)),
    hasMore: safePage < Math.ceil(total / safeLimit),
  };
};

const markAsRead = async ({ userId, notificationId }) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw ApiError.notFound("Notification not found");
  return notification;
};

const markAllAsRead = async ({ userId }) => {
  const result = await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  return { modifiedCount: result.modifiedCount };
};

const getUnreadCount = async ({ userId }) => {
  const count = await Notification.countDocuments({ userId, isRead: false });
  return { count };
};

const deleteNotification = async ({ userId, notificationId }) => {
  const notification = await Notification.findOneAndDelete({ _id: notificationId, userId });
  if (!notification) throw ApiError.notFound("Notification not found");
  return { success: true };
};

module.exports = {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
};
