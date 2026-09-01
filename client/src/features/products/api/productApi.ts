import { api } from "../../../shared/api/axios";
import type { ApiResponse } from "../../../shared/types/api";
import type { ProductDetail, ProductSummary } from "../types";

export const getProducts = async (): Promise<ProductSummary[]> => {
  const response = await api.get<ApiResponse<ProductSummary[]>>("/products");

  return response.data.data;
};

export const getProduct = async (id: string): Promise<ProductDetail> => {
  const response = await api.get<ApiResponse<ProductDetail>>(`/products/${id}`);

  return response.data.data;
};
