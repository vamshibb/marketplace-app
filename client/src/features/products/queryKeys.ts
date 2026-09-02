import type { ProductFilters } from "./types";

export const productsQueryKeys = {
  all: () => ["products"] as const,
  list: (filters: ProductFilters) => ["products", "list", filters] as const,
  detail: (id: string) => ["products", "detail", id] as const,
};
