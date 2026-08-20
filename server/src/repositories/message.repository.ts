import { Prisma } from "../generated/prisma";
import { prisma } from "../prisma/client";

export const createMessage = (
  data: Prisma.MessageUncheckedCreateInput
) => {
  return prisma.message.create({
    data,
  });
};

export const createMessageAndUpdateLastMessageAt = (
  data: Prisma.MessageUncheckedCreateInput
) => {
  return prisma.$transaction(async (transaction) => {
    const message = await transaction.message.create({
      data,
    });

    await transaction.conversation.update({
      where: { id: message.conversationId },
      data: { lastMessageAt: message.createdAt },
    });

    return message;
  });
};

export const findMessagesByConversation = (
  conversationId: string
) => {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: {
      createdAt: "asc",
    },
  });
};

export const findMessageById = (
  id: string
) => {
  return prisma.message.findUnique({
    where: { id },
  });
};

export const countMessages = (
  conversationId: string
) => {
  return prisma.message.count({
    where: { conversationId },
  });
};
