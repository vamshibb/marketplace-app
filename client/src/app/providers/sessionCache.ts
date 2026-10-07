import type { QueryClient, QueryKey } from "@tanstack/react-query";

// Session-owned keys only: public products, categories, reviews, reputation,
// and rental availability remain reusable across accounts.
export const isPrivateQueryKey = (key: QueryKey): boolean =>
  ["auth", "favorites", "orders", "messaging", "notifications", "availability-blocks"].includes(String(key[0])) ||
  (key[0] === "products" && key[1] === "mine") ||
  (key[0] === "reviews" && key[3] === "status");

export const clearSessionCache = (client: QueryClient): void => {
  // Removing queries also cancels in-flight queries so old responses cannot
  // populate the next session's cache. Mutation results can contain private DTOs.
  client.removeQueries({ predicate: query => isPrivateQueryKey(query.queryKey) });
  client.getMutationCache().clear();
};
