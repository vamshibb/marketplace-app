export const notificationQueryKeys = {
  list: (userId: string) => ["notifications", userId, "list"] as const,
  unreadCount: (userId: string) => ["notifications", userId, "unread-count"] as const,
};

