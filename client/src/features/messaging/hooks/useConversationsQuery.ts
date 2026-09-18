import { queryOptions, useQuery } from "@tanstack/react-query";
import { useAuthStore, useCurrentUserQuery } from "../../auth";
import { getConversations } from "../api/messagingApi";
import { messagingQueryKeys } from "../queryKeys";

export const conversationsQueryOptions = (userId: string | undefined) => queryOptions({
  queryKey: messagingQueryKeys.conversations(userId),
  queryFn: ({ signal }) => getConversations(signal),
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: false,
});

export const useConversationsQuery = () => {
  const token = useAuthStore((state) => state.token);
  const { data: user } = useCurrentUserQuery();
  return useQuery({
    ...conversationsQueryOptions(user?.id),
    enabled: Boolean(token && user),
  });
};
