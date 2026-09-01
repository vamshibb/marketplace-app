import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateProduct } from "../api/productApi";
import { productsQueryKeys } from "../queryKeys";
import type { ProductFormRequest } from "../types";

interface UpdateProductVariables {
  id: string;
  request: ProductFormRequest;
}

export const useUpdateProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: UpdateProductVariables) =>
      updateProduct(id, request),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({
        queryKey: productsQueryKeys.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: productsQueryKeys.detail(id),
      });
    },
  });
};
