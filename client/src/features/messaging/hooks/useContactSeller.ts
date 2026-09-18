import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authQueryKeys, getCurrentUser, useAuthStore } from "../../auth";
import { conversationsQueryOptions, useConversationsQuery } from "./useConversationsQuery";
import type { ConversationListItem } from "../types";

const findSellerConversation = (conversations: ConversationListItem[] | undefined, productId: string, sellerId: string) =>
  conversations?.find((conversation) => conversation.product?.id === productId && conversation.otherParticipant?.id === sellerId);

export const useContactSeller = (productId: string, sellerId: string, openComposer: () => void) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const conversations = useConversationsQuery();
  const existing = findSellerConversation(conversations.data, productId, sellerId);
  const lookup = useMutation({
    mutationFn: async () => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error("Please sign in to contact the seller.");
      // Resolve identity after authentication; the click may have started as a guest.
      const user = await queryClient.ensureQueryData({ queryKey: authQueryKeys.currentUser(), queryFn: getCurrentUser });
      if (user.id === sellerId) throw new Error("You cannot contact yourself about your own listing.");
      if (useAuthStore.getState().token !== token) throw new Error("Your session changed. Please try again.");
      const items = await queryClient.ensureQueryData(conversationsQueryOptions(user.id));
      return { conversation: findSellerConversation(items, productId, sellerId), token };
    },
    onSuccess: ({ conversation, token }) => {
      if (useAuthStore.getState().token !== token) return;
      if (conversation) navigate(`/messages/${conversation.id}`);
      else openComposer();
    },
    onError: () => toast.error("Unable to check your conversations. Please try again."),
  });
  return { existing, lookup };
};
