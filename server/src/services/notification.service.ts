import { NotificationType } from "../generated/prisma";
import { toNotificationDTO } from "../dto/notification.dto";
import { AppError } from "../errors/AppError";
import * as notificationRepository from "../repositories/notification.repository";

const MESSAGE_NOTIFICATION_TITLE = "New Message";
const buildMessageBody = (
  senderEmail: string,
  productTitle: string
) => `${senderEmail} sent you a message about ${productTitle}`;
const ORDER_CREATED_NOTIFICATION_TITLE = "New Order";
const buildOrderCreatedBody = (
  senderEmail: string,
  productTitle: string
) => `${senderEmail} placed an order for ${productTitle}`;
const ORDER_ACCEPTED_NOTIFICATION_TITLE = "Order Accepted";
const buildOrderAcceptedBody = (
  senderEmail: string,
  productTitle: string
) => `${senderEmail} accepted your order for ${productTitle}`;
const ORDER_REJECTED_NOTIFICATION_TITLE = "Order Rejected";
const buildOrderRejectedBody = (
  senderEmail: string,
  productTitle: string
) => `${senderEmail} rejected your order for ${productTitle}`;

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

export interface OrderNotificationPayload {
  recipientId: string;
  sender: {
    id: string;
    email: string;
  };
  product: {
    id: string;
    title: string;
  };
  orderId: string;
}

interface NotificationBuilderResult {
  recipientId: string;
  senderId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, string>;
}

type NotificationRecord = NonNullable<
  Awaited<
    ReturnType<
      typeof notificationRepository.findNotificationById
    >
  >
>;

const shouldSkipNotification = (
  senderId: string,
  recipientId: string
) => senderId === recipientId;

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

const buildOrderCreatedNotification = (
  payload: OrderNotificationPayload
): NotificationBuilderResult => {
  return {
    recipientId: payload.recipientId,
    senderId: payload.sender.id,
    type: NotificationType.ORDER,
    title: ORDER_CREATED_NOTIFICATION_TITLE,
    body: buildOrderCreatedBody(
      payload.sender.email,
      payload.product.title
    ),
    metadata: {
      orderId: payload.orderId,
      productId: payload.product.id,
    },
  };
};

const buildOrderAcceptedNotification = (
  payload: OrderNotificationPayload
): NotificationBuilderResult => {
  return {
    recipientId: payload.recipientId,
    senderId: payload.sender.id,
    type: NotificationType.ORDER,
    title: ORDER_ACCEPTED_NOTIFICATION_TITLE,
    body: buildOrderAcceptedBody(
      payload.sender.email,
      payload.product.title
    ),
    metadata: {
      orderId: payload.orderId,
      productId: payload.product.id,
    },
  };
};

const buildOrderRejectedNotification = (
  payload: OrderNotificationPayload
): NotificationBuilderResult => {
  return {
    recipientId: payload.recipientId,
    senderId: payload.sender.id,
    type: NotificationType.ORDER,
    title: ORDER_REJECTED_NOTIFICATION_TITLE,
    body: buildOrderRejectedBody(
      payload.sender.email,
      payload.product.title
    ),
    metadata: {
      orderId: payload.orderId,
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
    throw new AppError(
      "You are not authorized to access this notification.",
      403
    );
  }
};

export const notifyMessage = async (
  payload: MessageNotificationPayload
): Promise<void> => {
  if (
    shouldSkipNotification(
      payload.sender.id,
      payload.recipientId
    )
  ) {
    return;
  }

  const notification = buildMessageNotification(payload);

  await safeCreateNotification(notification);
};

export const notifyOrderCreated = async (
  payload: OrderNotificationPayload
): Promise<void> => {
  if (
    shouldSkipNotification(
      payload.sender.id,
      payload.recipientId
    )
  ) {
    return;
  }

  const notification = buildOrderCreatedNotification(payload);

  await safeCreateNotification(notification);
};

export const notifyOrderAccepted = async (
  payload: OrderNotificationPayload
): Promise<void> => {
  if (
    shouldSkipNotification(
      payload.sender.id,
      payload.recipientId
    )
  ) {
    return;
  }

  const notification = buildOrderAcceptedNotification(payload);

  await safeCreateNotification(notification);
};

export const notifyOrderRejected = async (
  payload: OrderNotificationPayload
): Promise<void> => {
  if (
    shouldSkipNotification(
      payload.sender.id,
      payload.recipientId
    )
  ) {
    return;
  }

  const notification = buildOrderRejectedNotification(payload);

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
