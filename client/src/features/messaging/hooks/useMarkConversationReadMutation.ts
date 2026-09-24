import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshNotificationCaches } from "../../notifications";
import { markConversationRead } from "../api/messagingApi";
import { messagingQueryKeys } from "../queryKeys";

export const useMarkConversationReadMutation = (conversationId: string, userId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (lastReadMessageId: string) => markConversationRead(conversationId, lastReadMessageId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: messagingQueryKeys.conversations(userId),
          refetchType: "all",
        }),
        refreshNotificationCaches(client, userId),
      ]);
    },
  });
};

