export const reviewQueryKeys = {
  product: (productId: string) => ["reviews", "product", productId] as const,
  status: (userId: string | undefined, orderId: string) => ["reviews", userId, orderId, "status"] as const,
  create: (userId: string | undefined, orderId: string) => ["reviews", userId, orderId, "create"] as const,
};
