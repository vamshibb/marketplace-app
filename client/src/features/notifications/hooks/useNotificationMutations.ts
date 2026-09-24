import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markAllNotificationsRead, markNotificationRead } from "../api/notificationApi";
import { notificationQueryKeys } from "../queryKeys";
import type { Notification } from "../types";

export const useMarkNotificationReadMutation = (userId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async (notification) => {
      await client.cancelQueries({ queryKey: notificationQueryKeys.list(userId) });
      client.setQueryData<Notification[]>(notificationQueryKeys.list(userId),
        (items) => items?.map((item) => item.id === notification.id ? notification : item));
      void client.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount(userId) });
    },
  });
};

export const useMarkAllNotificationsReadMutation = (userId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: notificationQueryKeys.list(userId) });
      client.setQueryData<Notification[]>(notificationQueryKeys.list(userId),
        (items) => items?.map((item) => ({ ...item, isRead: true })));
      void client.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount(userId) });
    },
  });
};

