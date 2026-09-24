import { useQuery } from "@tanstack/react-query";
import { getNotifications, getUnreadCount } from "../api/notificationApi";
import { notificationQueryKeys } from "../queryKeys";

export const useUnreadCountQuery = (userId: string) => useQuery({
  queryKey: notificationQueryKeys.unreadCount(userId),
  queryFn: ({ signal }) => getUnreadCount(signal),
  enabled: Boolean(userId),
  staleTime: 30_000,
  refetchOnWindowFocus: false,
});

export const useNotificationsQuery = (userId: string, open: boolean) => useQuery({
  queryKey: notificationQueryKeys.list(userId),
  queryFn: ({ signal }) => getNotifications(signal),
  enabled: Boolean(userId) && open,
  staleTime: 0,
  refetchOnWindowFocus: false,
});

