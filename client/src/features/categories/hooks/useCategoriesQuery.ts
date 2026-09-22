import { useQuery } from "@tanstack/react-query";

import { getCategories } from "../api/categoryApi";
import { categoriesQueryKeys } from "../queryKeys";

export const useCategoriesQuery = () => {
  return useQuery({
    queryKey: categoriesQueryKeys.all(),
    queryFn: getCategories,
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
};
