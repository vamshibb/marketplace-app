export const reviewQueryKeys = {
  status: (userId: string | undefined, orderId: string) => ["reviews", userId, orderId, "status"] as const,
  create: (userId: string | undefined, orderId: string) => ["reviews", userId, orderId, "create"] as const,
};
