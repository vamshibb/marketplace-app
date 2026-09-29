import { useQuery } from "@tanstack/react-query";
import { getProductReviews } from "../api/reviewApi";
import { reviewQueryKeys } from "../queryKeys";

export const useProductReviewsQuery = (productId: string) => {
  return useQuery({
    queryKey: reviewQueryKeys.product(productId),
    queryFn: ({ signal }) => getProductReviews(productId, signal),
    enabled: Boolean(productId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};
