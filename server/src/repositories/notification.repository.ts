import { userSummarySelect } from "./user.select";
import { Prisma } from "../generated/prisma";
import { prisma } from "../prisma/client";
import { isMessageRead, lockParticipant } from "./conversationRead.repository";

export const createMessageNotification = (
  data: Prisma.NotificationUncheckedCreateInput,
  conversationId: string,
  messageId: string,
) => prisma.$transaction(async (tx) => {
  const participants = await lockParticipant(tx, conversationId, data.recipientId);
  if (!participants.length) return null;
  const isRead = await isMessageRead(tx, conversationId, data.recipientId, messageId);
  return tx.notification.create({ data: { ...data, isRead } });
});

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  metadata: true,
  isRead: true,
  createdAt: true,
  sender: {
    select: userSummarySelect,
  },
} satisfies Prisma.NotificationSelect;

export const findNotificationById = (
  id: string
) => {
  return prisma.notification.findUnique({
    where: { id },
    select: {
      ...notificationSelect,
      recipientId: true,
    },
  });
};

export const findUserNotifications = (
  recipientId: string,
  take = 20
) => {
  return prisma.notification.findMany({
    where: { recipientId },
    select: notificationSelect,
    orderBy: {
      createdAt: "desc",
    },
    take,
  });
};

export const countUnreadNotifications = (
  recipientId: string
) => {
  return prisma.notification.count({
    where: {
      recipientId,
      isRead: false,
    },
  });
};

export const createNotification = (
  data: Prisma.NotificationUncheckedCreateInput
) => {
  return prisma.notification.create({
    data,
  });
};

export const markNotificationAsRead = (
  id: string
) => {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
    select: notificationSelect,
  });
};

export const markAllNotificationsAsRead = (
  recipientId: string
) => {
  return prisma.notification.updateMany({
    where: {
      recipientId,
      isRead: false,
    },
    data: { isRead: true },
  });
};
