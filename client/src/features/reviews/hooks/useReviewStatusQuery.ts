import { useQuery } from "@tanstack/react-query";
import { useAuthStore, useCurrentUserQuery } from "../../auth";
import { getReviewStatus } from "../api/reviewApi";
import { reviewQueryKeys } from "../queryKeys";

export const useReviewStatusQuery = (orderId: string, completed: boolean) => {
  const token = useAuthStore(state => state.token);
  const { data: user } = useCurrentUserQuery();
  return useQuery({
    queryKey: reviewQueryKeys.status(user?.id, orderId),
    queryFn: ({ signal }) => getReviewStatus(orderId, signal),
    enabled: Boolean(completed && token && user),
    staleTime: 0,
  });
};
