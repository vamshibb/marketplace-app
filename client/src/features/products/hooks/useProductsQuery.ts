import { useQuery } from "@tanstack/react-query";

import { getProducts } from "../api/productApi";
import { productsQueryKeys } from "../queryKeys";

export const useProductsQuery = () => {
  return useQuery({
    queryKey: productsQueryKeys.all(),
    queryFn: getProducts,
  });
};
