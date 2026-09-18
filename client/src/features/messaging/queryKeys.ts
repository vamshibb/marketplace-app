export const messagingQueryKeys = {
  conversation: (userId: string | undefined, id: string) => ["messaging", userId, "conversation", id] as const,
  messages: (userId: string | undefined, id: string) => ["messaging", userId, "messages", id] as const,
  create: (productId: string) => ["messaging", "create", productId] as const,
};
