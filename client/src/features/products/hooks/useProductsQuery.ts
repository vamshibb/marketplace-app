import { useQuery } from "@tanstack/react-query";

import { getProducts } from "../api/productApi";
import { productsQueryKeys } from "../queryKeys";
import type { ProductFilters } from "../types";

export const useProductsQuery = (filters: ProductFilters) => {
  return useQuery({
    queryKey: productsQueryKeys.list(filters),
    queryFn: () => getProducts(filters),
  });
};
