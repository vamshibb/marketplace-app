export const reviewQueryKeys = {
  user: (userId: string) => ["reviews", "user", userId] as const,
  product: (productId: string) => ["reviews", "product", productId] as const,
  status: (userId: string | undefined, orderId: string) => ["reviews", userId, orderId, "status"] as const,
  create: (userId: string | undefined, orderId: string) => ["reviews", userId, orderId, "create"] as const,
};
