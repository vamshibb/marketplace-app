import { createMessageAndUpdateLastMessageAt } from "./message.repository";
import { userSummarySelect } from "./user.select";
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
        select: userSummarySelect,
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
  userIds: string[],
  transaction: Prisma.TransactionClient = prisma
) => {
  return transaction.conversation.findFirst({
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

export const createConversationWithMessage = async (
  productId: string,
  userIds: string[],
  senderId: string,
  content: string
) => {
  // Retry serialization conflicts so concurrent first messages reuse the winner.
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const existing = await findConversationByProductAndUsers(productId, userIds, transaction);
        const conversation = existing ?? await transaction.conversation.create({
          data: {
            productId,
            participants: { create: userIds.map((userId) => ({ userId })) },
          },
        });

        const message = await createMessageAndUpdateLastMessageAt({
          conversationId: conversation.id,
          senderId,
          content,
        }, transaction);

        const savedConversation = await transaction.conversation.findUniqueOrThrow({
          where: { id: conversation.id },
          include: conversationInclude,
        });
        return { conversation: savedConversation, message };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) {
        continue;
      }
      throw error;
    }
  }
};

export const findUserConversations = (
  userId: string
) => {
  return prisma.conversation.findMany({
    where: {
      messages: { some: {} },
      participants: {
        some: { userId },
      },
    },
    include: {
      ...conversationInclude,
      messages: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
    orderBy: {
      lastMessageAt: "desc",
    },
  });
};
