import { useQuery } from "@tanstack/react-query";
import { useAuthStore, useCurrentUserQuery } from "../../auth";
import { getOrders } from "../api/orderApi";
import { ordersQueryKeys } from "../queryKeys";
import type { OrderRole } from "../types";

export const useOrdersQuery = (role: OrderRole) => {
  const token = useAuthStore((state) => state.token);
  const { data: user } = useCurrentUserQuery();
  return useQuery({
    queryKey: ordersQueryKeys.list(user?.id, role),
    queryFn: ({ signal }) => getOrders(role, signal),
    enabled: Boolean(token && user),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

