import { useQuery } from "@tanstack/react-query";
import { getAvailabilityBlocks } from "../api/availabilityBlocksApi";
import { productsQueryKeys } from "../queryKeys";

export const useAvailabilityBlocksQuery = (productId: string, userId: string) => useQuery({
  queryKey: productsQueryKeys.availabilityBlocks(userId, productId),
  queryFn: ({ signal }) => getAvailabilityBlocks(productId, signal),
  enabled: Boolean(productId && userId),
  staleTime: 60_000,
  refetchOnWindowFocus: false,
  retry: false,
});
