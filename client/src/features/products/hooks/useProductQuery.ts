import { useQuery } from "@tanstack/react-query";

import { getProduct } from "../api/productApi";
import { productsQueryKeys } from "../queryKeys";

export const useProductQuery = (id: string | undefined) => {
  return useQuery({
    queryKey: productsQueryKeys.detail(id ?? ""),
    queryFn: () => getProduct(id!),
    enabled: Boolean(id),
  });
};
