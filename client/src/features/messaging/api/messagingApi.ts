import { api } from "../../../shared/api/axios";
import type { ApiResponse } from "../../../shared/types/api";
import type { Conversation, ConversationListItem, Message } from "../types";
import type { MessageFormValues } from "../schemas/messageSchema";

export const markConversationRead = async (id: string, lastReadMessageId: string): Promise<void> => {
  await api.patch(`/conversations/${encodeURIComponent(id)}/read`, { lastReadMessageId });
};

export const createConversation = async (productId: string, values: MessageFormValues): Promise<Conversation> => {
  const response = await api.post<ApiResponse<Conversation>>(`/products/${encodeURIComponent(productId)}/conversations`, values);
  return response.data.data;
};

export const getConversation = async (id: string, signal?: AbortSignal): Promise<Conversation> => {
  const response = await api.get<ApiResponse<Conversation>>(`/conversations/${encodeURIComponent(id)}`, { signal });
  return response.data.data;
};

export const getMessages = async (id: string, signal?: AbortSignal): Promise<Message[]> => {
  const response = await api.get<ApiResponse<Message[]>>(`/conversations/${encodeURIComponent(id)}/messages`, { signal });
  return response.data.data;
};

export const sendMessage = async (id: string, values: MessageFormValues): Promise<Message> => {
  const response = await api.post<ApiResponse<Message>>(`/conversations/${encodeURIComponent(id)}/messages`, values);
  return response.data.data;
};

export const getConversations = async (signal?: AbortSignal): Promise<ConversationListItem[]> => {
  const response = await api.get<ApiResponse<ConversationListItem[]>>("/conversations", { signal });
  return response.data.data;
};
