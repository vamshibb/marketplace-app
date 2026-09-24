import type { QueryClient } from "@tanstack/react-query";
import { notificationQueryKeys } from "./queryKeys";

export const refreshNotificationCaches = (client: QueryClient, userId: string) => Promise.all([
  client.invalidateQueries({ queryKey: notificationQueryKeys.list(userId) }),
  client.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount(userId) }),
]);

