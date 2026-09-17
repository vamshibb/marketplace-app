import { useQuery } from "@tanstack/react-query";

import { useAuthStore, useCurrentUserQuery } from "../../auth";
import { getMyProducts } from "../api/productApi";
import { productsQueryKeys } from "../queryKeys";

export const useMyProductsQuery = () => {
  const token = useAuthStore((state) => state.token);
  const { data: user } = useCurrentUserQuery();

  return useQuery({
    queryKey: productsQueryKeys.mine(user?.id ?? ""),
    queryFn: ({ signal }) => getMyProducts(signal),
    enabled: Boolean(token && user),
  });
};
