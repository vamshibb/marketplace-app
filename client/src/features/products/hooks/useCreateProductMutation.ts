import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createProduct } from "../api/productApi";
import { productsQueryKeys } from "../queryKeys";

export const useCreateProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: productsQueryKeys.all(),
      });
    },
  });
};
