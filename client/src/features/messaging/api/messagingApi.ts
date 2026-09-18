import { api } from "../../../shared/api/axios";
import type { ApiResponse } from "../../../shared/types/api";
import type { Conversation, Message } from "../types";
import type { MessageFormValues } from "../schemas/messageSchema";

export const createConversation = async (productId: string): Promise<Conversation> => {
  const response = await api.post<ApiResponse<Conversation>>(`/products/${encodeURIComponent(productId)}/conversations`);
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
