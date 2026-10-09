import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateProduct } from "../api/productApi";
import { productsQueryKeys } from "../queryKeys";
import { favoritesQueryKeys } from "../favoritesQueryKeys";
import { rentalAvailabilityQueryKeys } from "../../orders/availability";
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
    onSuccess: async (_, { id }) => {
      await Promise.all([
        // Includes detail, public lists, and the owner's listings.
        queryClient.invalidateQueries({ queryKey: productsQueryKeys.all() }),
        queryClient.invalidateQueries({ queryKey: favoritesQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: rentalAvailabilityQueryKeys.availabilityRoot(id) }),
      ]);
    },
  });
};
