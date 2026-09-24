import { api } from "../../../shared/api/axios";
import type { ApiResponse } from "../../../shared/types/api";
import type { Notification } from "../types";

export const getNotifications = async (signal?: AbortSignal): Promise<Notification[]> => {
  const response = await api.get<ApiResponse<Notification[]>>("/notifications", { signal });
  return response.data.data;
};
export const getUnreadCount = async (signal?: AbortSignal): Promise<number> => {
  const response = await api.get<ApiResponse<{ count: number }>>("/notifications/unread-count", { signal });
  return response.data.data.count;
};
export const markNotificationRead = async (id: string): Promise<Notification> => {
  const response = await api.patch<ApiResponse<Notification>>(`/notifications/${encodeURIComponent(id)}/read`);
  return response.data.data;
};
export const markAllNotificationsRead = async (): Promise<{ updatedCount: number }> => {
  const response = await api.patch<ApiResponse<{ updatedCount: number }>>("/notifications/read-all");
  return response.data.data;
};

