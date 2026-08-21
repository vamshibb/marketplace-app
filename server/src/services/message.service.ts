import { AppError } from "../errors/AppError";
import { toMessageDTO } from "../dto/message.dto";
import * as conversationRepository from "../repositories/conversation.repository";
import * as messageRepository from "../repositories/message.repository";
import * as notificationService from "./notification.service";

const ensureConversationExists = async (
  conversationId: string
) => {
  const conversation =
    await conversationRepository.findConversationById(
      conversationId
    );

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  return conversation;
};

const ensureParticipant = async (
  conversationId: string,
  userId: string
) => {
  const conversation = await ensureConversationExists(
    conversationId
  );

  if (
    !conversation.participants.some(
      (participant) => participant.userId === userId
    )
  ) {
    throw new AppError("Forbidden", 403);
  }

  return conversation;
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  content: string
) => {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new AppError("Message content is required", 400);
  }

  const conversation = await ensureParticipant(
    conversationId,
    senderId
  );

  const message =
    await messageRepository.createMessageAndUpdateLastMessageAt({
      conversationId,
      senderId,
      content: trimmedContent,
    });

  const sender = conversation.participants.find(
    (participant) => participant.userId === senderId
  )!.user;

  const recipient = conversation.participants.find(
    (participant) => participant.userId !== senderId
  );

  if (recipient && conversation.product) {
    await notificationService.notifyMessage({
      recipientId: recipient.userId,
      sender,
      product: conversation.product,
      conversationId,
    });
  }

  return toMessageDTO(message, sender);
};

export const getConversationMessages = async (
  conversationId: string,
  userId: string
) => {
  const conversation = await ensureParticipant(
    conversationId,
    userId
  );

  const messages =
    await messageRepository.findMessagesByConversation(
      conversationId
    );

  const participantsById = new Map(
    conversation.participants.map((participant) => [
      participant.userId,
      participant.user,
    ])
  );

  return messages.map((message) => {
    const sender = participantsById.get(message.senderId);

    if (!sender) {
      throw new AppError("Message sender not found", 500);
    }

    return toMessageDTO(message, sender);
  });
};
