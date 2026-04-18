import api from "./client";

export type Notification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string;
  metadata: {
    postId?: string;
    commentId?: string;
    problemId?: string;
    sessionId?: string;
    fromUserId?: string;
    fromUserName?: string;
  };
  createdAt: string;
};

export type NotificationListResponse = {
  items: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pages: number;
  hasMore: boolean;
};

export const notificationApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get<NotificationListResponse>("/notifications", { params }),

  unreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),

  markRead: (id: string) => api.put(`/notifications/${id}/read`),

  markAllRead: () => api.put("/notifications/read-all"),

  remove: (id: string) => api.delete(`/notifications/${id}`),
};
