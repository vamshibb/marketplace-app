import { api } from "../../../shared/api/axios";
import type { ApiResponse } from "../../../shared/types/api";
import type { ProductAvailability } from "../availabilityTypes";

export const getProductAvailability = async (
  productId: string, from: string, to: string, signal?: AbortSignal,
): Promise<ProductAvailability> => {
  const response = await api.get<ApiResponse<ProductAvailability>>(
    `/products/${encodeURIComponent(productId)}/availability`, { params: { from, to }, signal },
  );
  return response.data.data;
};
