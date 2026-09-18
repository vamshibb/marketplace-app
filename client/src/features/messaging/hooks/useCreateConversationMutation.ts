import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authQueryKeys, getCurrentUser, useAuthStore } from "../../auth";
import { createConversation } from "../api/messagingApi";
import { messagingQueryKeys } from "../queryKeys";

export const useCreateConversationMutation = (productId: string, sellerId: string) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationKey: messagingQueryKeys.create(productId),
    mutationFn: async () => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error("Please sign in to contact the seller.");
      // Resolve identity after the auth modal completes, including an owner signing in.
      const user = await queryClient.ensureQueryData({ queryKey: authQueryKeys.currentUser(), queryFn: getCurrentUser });
      if (user.id === sellerId) throw new Error("You cannot contact yourself about your own listing.");
      if (useAuthStore.getState().token !== token) throw new Error("Your session changed. Please try again.");
      const conversation = await createConversation(productId);
      return { conversation, userId: user.id, token };
    },
    onSuccess: ({ conversation, userId, token }) => {
      if (useAuthStore.getState().token !== token) return;
      queryClient.setQueryData(messagingQueryKeys.conversation(userId, conversation.id), conversation);
      navigate(`/messages/${conversation.id}`);
    },
    onError: (error) => toast.error(error.message || "Unable to contact seller."),
  });
};
