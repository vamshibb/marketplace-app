import { api } from "../../../shared/api/axios";
import type { ApiResponse } from "../../../shared/types/api";
import type { AvailabilityBlock, CreateAvailabilityBlock } from "../availabilityBlockTypes";

const path = (productId: string) => `/products/${encodeURIComponent(productId)}/availability-blocks`;
export const getAvailabilityBlocks = async (productId: string, signal?: AbortSignal): Promise<AvailabilityBlock[]> => {
  const response = await api.get<ApiResponse<AvailabilityBlock[]>>(path(productId), { signal });
  return response.data.data;
};
export const createAvailabilityBlock = async (productId: string, input: CreateAvailabilityBlock): Promise<AvailabilityBlock> => {
  const response = await api.post<ApiResponse<AvailabilityBlock>>(path(productId), input);
  return response.data.data;
};
export const deleteAvailabilityBlock = async (productId: string, blockId: string): Promise<void> => {
  await api.delete(`${path(productId)}/${encodeURIComponent(blockId)}`);
};
