import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { subscribeToRealtimeEvents } from "../../../shared/realtime/realtimeEvents";
import { messagingQueryKeys } from "../queryKeys";

const invalidateMessagingForConversation = async (
  client: ReturnType<typeof useQueryClient>,
  userId: string,
  conversationId: string,
) => {
  await Promise.all([
    client.invalidateQueries({ queryKey: messagingQueryKeys.messages(userId, conversationId), refetchType: "active" }),
    client.invalidateQueries({ queryKey: messagingQueryKeys.conversation(userId, conversationId), refetchType: "active" }),
    client.invalidateQueries({ queryKey: messagingQueryKeys.conversations(userId), refetchType: "active" }),
  ]);
};

export const useMessagingRealtime = (userId?: string): void => {
  const client = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToRealtimeEvents((eventName, payload) => {
      if (eventName === "connected") {
        void client.invalidateQueries({
          queryKey: ["messaging", userId],
          refetchType: "active",
        });
        return;
      }

      if (!payload || typeof payload !== "object") return;

      const event = payload as Record<string, unknown>;
      const conversationId = typeof event.conversationId === "string" ? event.conversationId : undefined;

      if (eventName === "message_created" && conversationId) {
        void invalidateMessagingForConversation(client, userId, conversationId);
        return;
      }

      if (eventName === "conversation_read_changed" && conversationId) {
        void invalidateMessagingForConversation(client, userId, conversationId);
      }
    });

    return unsubscribe;
  }, [client, userId]);
};
