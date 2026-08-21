import { Prisma } from "../generated/prisma";
import { prisma } from "../prisma/client";

export const findNotificationById = (
  id: string
) => {
  return prisma.notification.findUnique({
    where: { id },
    select: {
      id: true,
      recipientId: true,
      senderId: true,
      type: true,
      title: true,
      body: true,
      metadata: true,
      isRead: true,
      createdAt: true,
    },
  });
};

export const findUserNotifications = (
  recipientId: string,
  take = 20
) => {
  return prisma.notification.findMany({
    where: { recipientId },
    select: {
      id: true,
      recipientId: true,
      senderId: true,
      type: true,
      title: true,
      body: true,
      metadata: true,
      isRead: true,
      createdAt: true,
    },
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
