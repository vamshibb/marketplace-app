import { Prisma } from "../generated/prisma";
import { prisma } from "../prisma/client";

export const createMessageAndUpdateLastMessageAt = (
  data: Prisma.MessageUncheckedCreateInput,
  transaction?: Prisma.TransactionClient
) => {
  const createMessage = async (transaction: Prisma.TransactionClient) => {
    const message = await transaction.message.create({
      data,
    });

    await transaction.conversation.update({
      where: { id: message.conversationId },
      data: { lastMessageAt: message.createdAt },
    });

    return message;
  };

  return transaction ? createMessage(transaction) : prisma.$transaction(createMessage);
};

export const findMessagesByConversation = (
  conversationId: string
) => {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
};

export const findMessageById = (id: string) => prisma.message.findUnique({ where: { id } });
