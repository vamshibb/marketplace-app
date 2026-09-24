import type { ConversationListItem } from "../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { MessageFormValues } from "../schemas/messageSchema";
import { authQueryKeys, getCurrentUser, useAuthStore } from "../../auth";
import { createConversation } from "../api/messagingApi";
import { messagingQueryKeys } from "../queryKeys";

export const useCreateConversationMutation = (productId: string, sellerId: string, onCreated: () => void) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationKey: messagingQueryKeys.create(productId),
    mutationFn: async (values: MessageFormValues) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error("Please sign in to contact the seller.");
      // Resolve identity after the auth modal completes, including an owner signing in.
      const user = await queryClient.ensureQueryData({ queryKey: authQueryKeys.currentUser(), queryFn: getCurrentUser });
      if (user.id === sellerId) throw new Error("You cannot contact yourself about your own listing.");
      if (useAuthStore.getState().token !== token) throw new Error("Your session changed. Please try again.");
      const conversation = await createConversation(productId, values);
      return { conversation, userId: user.id, token };
    },
    onSuccess: async ({ conversation, userId, token }) => {
      if (useAuthStore.getState().token !== token) return;
      const listKey = messagingQueryKeys.conversations(userId);
      await queryClient.cancelQueries({ queryKey: listKey, exact: true });
      if (useAuthStore.getState().token !== token) return;
      queryClient.setQueryData(messagingQueryKeys.conversation(userId, conversation.id), conversation);
      queryClient.setQueryData<ConversationListItem[]>(listKey, (current = []) => {
        const previous = current.find((item) => item.id === conversation.id);
        const item: ConversationListItem = {
          id: conversation.id,
          unreadCount: previous?.unreadCount ?? 0,
          product: conversation.product,
          otherParticipant: conversation.participants.find((participant) => participant.id !== userId) ?? null,
          lastMessageAt: conversation.lastMessageAt,
          // The creation response contains no message DTO; the list refresh supplies it.
          lastMessage: previous?.lastMessage ?? null,
        };
        return [item, ...current.filter((entry) => entry.id !== conversation.id)]
          .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt));
      });
      void queryClient.invalidateQueries({ queryKey: messagingQueryKeys.conversations(userId), exact: true });
      void queryClient.invalidateQueries({ queryKey: messagingQueryKeys.messages(userId, conversation.id), exact: true });
      onCreated();
      navigate(`/messages/${conversation.id}`);
    },
  });
};
