import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteProduct } from "../api/productApi";
import { productsQueryKeys } from "../queryKeys";

export const useDeleteProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({
        queryKey: productsQueryKeys.all(),
      });

      queryClient.removeQueries({
        queryKey: productsQueryKeys.detail(id),
      });
    },
  });
};