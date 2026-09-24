import * as conversationReadRepository from "../repositories/conversationRead.repository";
import * as messageRepository from "../repositories/message.repository";
import * as notificationService from "./notification.service";
import { AppError } from "../errors/AppError";
import {
  toConversationDTO,
  toConversationListDTO,
} from "../dto/conversation.dto";
import * as conversationRepository from "../repositories/conversation.repository";
import * as productRepository from "../repositories/product.repository";

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

const ensureParticipant = (
  participants: Array<{ userId: string }>,
  userId: string
) => {
  if (!participants.some((participant) => participant.userId === userId)) {
    throw new AppError(
      "You are not a participant in this conversation.",
      403
    );
  }
};

const ensureProductExists = async (
  productId: string
) => {
  const product =
    await productRepository.findProductOwner(productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return product;
};

export const createConversation = async (
  productId: string,
  buyerId: string,
  content: string
) => {
  const product = await ensureProductExists(productId);

  if (product.sellerId === buyerId) {
    throw new AppError(
      "You cannot start a conversation with yourself",
      400
    );
  }

  const { conversation, message } = await conversationRepository.createConversationWithMessage(
    productId,
    [buyerId, product.sellerId],
    buyerId,
    content
  );

  // Notify only after the conversation and message have committed.
  const sender = conversation.participants.find((participant) => participant.userId === buyerId)!.user;
  if (conversation.product) {
    await notificationService.notifyMessage({
      recipientId: product.sellerId,
      sender,
      product: conversation.product,
      conversationId: conversation.id,
      messageId: message.id,
    });
  }

  return toConversationDTO(conversation);
};

export const getConversationById = async (
  conversationId: string,
  userId: string
) => {
  const conversation = await ensureConversationExists(
    conversationId
  );

  ensureParticipant(conversation.participants, userId);

  return toConversationDTO(conversation);
};

export const getUserConversations = async (
  userId: string
) => {
  const conversations =
    await conversationRepository.findUserConversations(
      userId
    );

  const counts = await conversationReadRepository.countUnreadByConversation(userId);
  const unread = new Map(counts.map((row) => [row.conversationId, row.unreadCount]));
  return conversations.map((conversation) =>
    toConversationListDTO(conversation, userId, unread.get(conversation.id) ?? 0)
  );
};

export const markConversationRead = async (conversationId: string, userId: string, messageId: string) => {
  const conversation = await ensureConversationExists(conversationId);
  ensureParticipant(conversation.participants, userId);
  const message = await messageRepository.findMessageById(messageId);
  if (!message || message.conversationId !== conversationId) {
    throw new AppError("Message does not belong to this conversation", 400);
  }
  const result = await conversationReadRepository.markConversationRead(conversationId, userId, messageId);
  if (!result) throw new AppError("You are not a participant in this conversation.", 403);
  return result;
};
