import { Prisma } from "../generated/prisma";
import { prisma } from "../prisma/client";

const conversationInclude = {
  product: {
    select: {
      id: true,
      title: true,
    },
  },
  participants: {
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  },
} satisfies Prisma.ConversationInclude;

export const findConversationById = (
  id: string
) => {
  return prisma.conversation.findUnique({
    where: { id },
    include: conversationInclude,
  });
};

export const findConversationByProductAndUsers = (
  productId: string | null,
  userIds: string[]
) => {
  return prisma.conversation.findFirst({
    where: {
      productId,
      AND: userIds.map((userId) => ({
        participants: {
          some: { userId },
        },
      })),
      participants: {
        every: {
          userId: {
            in: userIds,
          },
        },
      },
    },
    include: conversationInclude,
  });
};

export const createConversationAndParticipants = (
  productId: string,
  userIds: string[]
) => {
  return prisma.$transaction(async (transaction) => {
    const conversation =
      await transaction.conversation.create({
        data: { productId },
      });

    await transaction.conversationParticipant.createMany({
      data: userIds.map((userId) => ({
        conversationId: conversation.id,
        userId,
      })),
    });

    return transaction.conversation.findUnique({
      where: { id: conversation.id },
      include: conversationInclude,
    });
  });
};

export const findUserConversations = (
  userId: string
) => {
  return prisma.conversation.findMany({
    where: {
      participants: {
        some: { userId },
      },
    },
    include: {
      ...conversationInclude,
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      lastMessageAt: "desc",
    },
  });
};
