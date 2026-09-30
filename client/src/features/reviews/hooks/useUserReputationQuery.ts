import { useQuery } from "@tanstack/react-query";
import { getUserReputation } from "../api/reviewApi";
import { reviewQueryKeys } from "../queryKeys";

export const useUserReputationQuery = (userId: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: reviewQueryKeys.user(userId ?? ""),
    queryFn: ({ signal }) => getUserReputation(userId!, signal),
    enabled: Boolean(userId && enabled),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};
