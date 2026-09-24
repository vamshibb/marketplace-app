import { Prisma } from "../generated/prisma";
import { prisma } from "../prisma/client";

// Both cursor updates and delayed notification creation lock this same row.
export const lockParticipant = (tx: Prisma.TransactionClient, conversationId: string, userId: string) =>
  tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "ConversationParticipant"
    WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
    FOR UPDATE
  `;

export const isMessageRead = async (
  tx: Prisma.TransactionClient, conversationId: string, userId: string, messageId: string,
): Promise<boolean> => {
  const rows = await tx.$queryRaw<Array<{ read: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM "ConversationParticipant" p
      JOIN "Message" cursor ON cursor.id = p."lastReadMessageId"
        AND cursor."conversationId" = p."conversationId"
      JOIN "Message" m ON m.id = ${messageId} AND m."conversationId" = p."conversationId"
      WHERE p."conversationId" = ${conversationId} AND p."userId" = ${userId}
        AND (m."createdAt", m.id) <= (cursor."createdAt", cursor.id)
    ) AS read
  `;
  return rows[0].read;
};

export const countUnreadByConversation = (userId: string) =>
  prisma.$queryRaw<Array<{ conversationId: string; unreadCount: number }>>`
    SELECT p."conversationId", COUNT(m.id)::int AS "unreadCount"
    FROM "ConversationParticipant" p
    LEFT JOIN "Message" cursor ON cursor.id = p."lastReadMessageId"
      AND cursor."conversationId" = p."conversationId"
    LEFT JOIN "Message" m ON m."conversationId" = p."conversationId"
      AND m."senderId" <> ${userId}
      AND (cursor.id IS NULL OR (m."createdAt", m.id) > (cursor."createdAt", cursor.id))
    WHERE p."userId" = ${userId}
    GROUP BY p."conversationId"
  `;

export const markConversationRead = (
  conversationId: string, userId: string, messageId: string,
) => prisma.$transaction(async (tx) => {
  const participants = await lockParticipant(tx, conversationId, userId);
  if (!participants.length) return null;

  // Compare inside PostgreSQL so timestamp precision and ID ordering match counts.
  await tx.$executeRaw`
    UPDATE "ConversationParticipant" p SET "lastReadMessageId" = target.id
    FROM "Message" target
    WHERE p."conversationId" = ${conversationId} AND p."userId" = ${userId}
      AND target.id = ${messageId} AND target."conversationId" = p."conversationId"
      AND NOT EXISTS (
        SELECT 1 FROM "Message" cursor
        WHERE cursor.id = p."lastReadMessageId" AND cursor."conversationId" = p."conversationId"
          AND (cursor."createdAt", cursor.id) >= (target."createdAt", target.id)
      )
  `;

  const updatedNotifications = await tx.$executeRaw`
    UPDATE "Notification" n SET "isRead" = true, "updatedAt" = NOW()
    FROM "Message" acknowledged
    WHERE acknowledged.id = ${messageId} AND acknowledged."conversationId" = ${conversationId}
      AND n."recipientId" = ${userId} AND n.type = 'MESSAGE' AND n."isRead" = false
      AND n.metadata->>'conversationId' = ${conversationId}
      AND (
        EXISTS (
          SELECT 1 FROM "Message" m
          WHERE m.id = n.metadata->>'messageId' AND m."conversationId" = ${conversationId}
            AND (m."createdAt", m.id) <= (acknowledged."createdAt", acknowledged.id)
        )
        OR (
          n.metadata->>'messageId' IS NULL
          AND n."createdAt" <= acknowledged."createdAt"
        )
      )
  `;
  const participant = await tx.conversationParticipant.findUniqueOrThrow({
    where: { conversationId_userId: { conversationId, userId } },
    select: { lastReadMessageId: true },
  });
  return { conversationId, ...participant, updatedNotifications };
});

