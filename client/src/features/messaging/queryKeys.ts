export const messagingQueryKeys = {
  conversations: (userId: string | undefined) => ["messaging", userId, "conversations"] as const,
  conversation: (userId: string | undefined, id: string) => ["messaging", userId, "conversation", id] as const,
  messages: (userId: string | undefined, id: string) => ["messaging", userId, "messages", id] as const,
  create: (productId: string) => ["messaging", "create", productId] as const,
};
