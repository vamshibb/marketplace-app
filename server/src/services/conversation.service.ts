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
    throw new AppError("Forbidden", 403);
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
  buyerId: string
) => {
  const product = await ensureProductExists(productId);

  if (product.sellerId === buyerId) {
    throw new AppError(
      "You cannot start a conversation with yourself",
      400
    );
  }

  const userIds = [buyerId, product.sellerId];
  const existingConversation =
    await conversationRepository.findConversationByProductAndUsers(
      productId,
      userIds
    );

  if (existingConversation) {
    const conversation = await ensureConversationExists(
      existingConversation.id
    );

    return toConversationDTO(conversation);
  }

  const conversation =
    await conversationRepository.createConversationAndParticipants(
      productId,
      userIds
    );

  if (!conversation) {
    throw new AppError("Conversation could not be created", 500);
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

  return conversations.map((conversation) =>
    toConversationListDTO(conversation, userId)
  );
};
