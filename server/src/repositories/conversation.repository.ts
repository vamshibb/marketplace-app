import { Prisma } from "../generated/prisma";
import { prisma } from "../prisma/client";

export const findConversationById = (
  id: string
) => {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
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
    },
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
    include: {
      participants: true,
    },
  });
};

export const createConversation = (
  data: Prisma.ConversationUncheckedCreateInput
) => {
  return prisma.conversation.create({
    data,
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
      include: {
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
      },
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

export const findConversationParticipants = (
  conversationId: string
) => {
  return prisma.conversationParticipant.findMany({
    where: { conversationId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
};

export const findConversationParticipant = (
  conversationId: string,
  userId: string
) => {
  return prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });
};

export const createParticipants = (
  data: Prisma.ConversationParticipantCreateManyInput[]
) => {
  return prisma.conversationParticipant.createManyAndReturn({
    data,
  });
};

export const updateLastMessageAt = (
  conversationId: string,
  lastMessageAt: Date
) => {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt },
  });
};
