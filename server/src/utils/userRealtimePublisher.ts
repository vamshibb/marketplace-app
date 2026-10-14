import { createScopedSsePublisher } from "./scopedSsePublisher";

export type UserRealtimeEvent =
  | { type: "message_created"; data: { conversationId: string; messageId: string; senderId: string } }
  | { type: "conversation_read_changed"; data: { conversationId: string; userId: string; lastReadMessageId: string | null } }
  | { type: "notification_created"; data: { notificationId: string } }
  | { type: "notification_read_changed"; data:
      | { scope: "notification"; notificationId: string }
      | { scope: "conversation"; conversationId: string }
      | { scope: "all" }
    };

export const createUserRealtimePublisher = (heartbeatMs = 25_000) => {
  const publisher = createScopedSsePublisher({
    heartbeatMs,
    connectedData: () => ({ version: 1 }),
    cacheControl: "private, no-store, no-transform",
  });
  return {
    subscribe: publisher.subscribe,
    unsubscribe: publisher.unsubscribe,
    publish: (userId: string, event: UserRealtimeEvent): void => {
      publisher.publish(userId, event.type, event.data);
    },
  };
};

export const userRealtimePublisher = createUserRealtimePublisher();

// Best-effort delivery after persistence. Keep this boundary even if the
// underlying transport is replaced with shared pub/sub in a later milestone.
export const publishUserEvent = (userId: string, event: UserRealtimeEvent): void => {
  try {
    userRealtimePublisher.publish(userId, event);
  } catch {
    // Never turn a successful mutation into an error because delivery failed.
  }
};
