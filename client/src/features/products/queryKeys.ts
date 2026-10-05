import type { ProductFilters } from "./types";

export const productsQueryKeys = {
  availabilityBlocks: (userId: string, productId: string) => ["availability-blocks", userId, productId] as const,
  all: () => ["products"] as const,
  mine: (userId: string) => ["products", "mine", userId] as const,
  list: (filters: ProductFilters) => ["products", "list", filters] as const,
  detail: (id: string) => ["products", "detail", id] as const,
};
