import { queryOptions, useQuery } from "@tanstack/react-query";
import { useAuthStore, useCurrentUserQuery } from "../../auth";
import { getOrder } from "../api/orderApi";
import { ordersQueryKeys } from "../queryKeys";

export const orderQueryOptions = (userId: string | undefined, id: string) => queryOptions({
  queryKey: ordersQueryKeys.detail(userId, id),
  queryFn: ({ signal }) => getOrder(id, signal),
  staleTime: 30_000,
  retry: false,
  refetchOnWindowFocus: false,
});

export const useOrderQuery = (id: string, enabled: boolean) => {
  const token = useAuthStore(state => state.token);
  const { data: user } = useCurrentUserQuery();
  return useQuery({ ...orderQueryOptions(user?.id, id), enabled: Boolean(enabled && id && token && user) });
};
