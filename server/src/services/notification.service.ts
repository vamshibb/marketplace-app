import { NotificationType } from "../generated/prisma";
import { toNotificationDTO } from "../dto/notification.dto";
import { AppError } from "../errors/AppError";
import * as notificationRepository from "../repositories/notification.repository";

const MESSAGE_NOTIFICATION_TITLE = "New Message";
const buildMessageBody = (
  senderEmail: string,
  productTitle: string
) => `${senderEmail} sent you a message about ${productTitle}`;

export interface MessageNotificationPayload {
  recipientId: string;
  sender: {
    id: string;
    email: string;
  };
  product: {
    id: string;
    title: string;
  };
  conversationId: string;
}

interface NotificationBuilderResult {
  recipientId: string;
  senderId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: {
    conversationId: string;
    productId: string;
  };
}

type NotificationRecord = NonNullable<
  Awaited<
    ReturnType<
      typeof notificationRepository.findNotificationById
    >
  >
>;

const buildMessageNotification = (
  payload: MessageNotificationPayload
): NotificationBuilderResult => {
  return {
    recipientId: payload.recipientId,
    senderId: payload.sender.id,
    type: NotificationType.MESSAGE,
    title: MESSAGE_NOTIFICATION_TITLE,
    body: buildMessageBody(
      payload.sender.email,
      payload.product.title
    ),
    metadata: {
      conversationId: payload.conversationId,
      productId: payload.product.id,
    },
  };
};

const safeCreateNotification = async (
  data: NotificationBuilderResult
): Promise<void> => {
  try {
    await notificationRepository.createNotification(data);
  } catch (error) {
    console.error("Failed to create notification", error);
  }
};

const ensureNotificationExists = async (
  id: string
) => {
  const notification =
    await notificationRepository.findNotificationById(id);

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  return notification;
};

const ensureRecipient = (
  notification: NotificationRecord,
  userId: string
) => {
  if (notification.recipientId !== userId) {
    throw new AppError("Forbidden", 403);
  }
};

export const notifyMessage = async (
  payload: MessageNotificationPayload
): Promise<void> => {
  if (payload.sender.id === payload.recipientId) {
    return;
  }

  const notification = buildMessageNotification(payload);

  await safeCreateNotification(notification);
};

export const getNotifications = async (
  userId: string
) => {
  const notifications =
    await notificationRepository.findUserNotifications(userId);

  return notifications.map(toNotificationDTO);
};

export const getUnreadCount = (
  userId: string
) => {
  return notificationRepository.countUnreadNotifications(userId);
};

export const markAsRead = async (
  notificationId: string,
  userId: string
) => {
  const notification = await ensureNotificationExists(
    notificationId
  );

  ensureRecipient(notification, userId);

  const updatedNotification =
    await notificationRepository.markNotificationAsRead(
      notificationId
    );

  return toNotificationDTO(updatedNotification);
};

export const markAllAsRead = (
  userId: string
) => {
  return notificationRepository.markAllNotificationsAsRead(
    userId
  );
};
