import { NotificationType } from "../generated/prisma";

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  sender: {
    id: string;
    email: string;
  } | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
}

interface NotificationSource {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  sender: {
    id: string;
    email: string;
  } | null;
  metadata: unknown;
  isRead: boolean;
  createdAt: Date;
}

export const toNotificationDTO = (
  notification: NotificationSource
): NotificationDTO => {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    sender: notification.sender,
    metadata:
      notification.metadata !== null &&
      typeof notification.metadata === "object" &&
      !Array.isArray(notification.metadata)
        ? notification.metadata as Record<string, unknown>
        : null,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  };
};
