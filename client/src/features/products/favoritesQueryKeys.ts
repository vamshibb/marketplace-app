export const favoritesQueryKeys = {
  lists: () => ["favorites", "list"] as const,
  list: (userId: string) => ["favorites", "list", userId] as const,
  toggle: (productId: string) => ["favorites", "toggle", productId] as const,
};
