import { api } from "../../../shared/api/axios";
import type { ApiResponse } from "../../../shared/types/api";
import type {
  ProductFormRequest,
  ProductDetail,
  ProductSummary,
} from "../types";

export interface CreatedProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  sellerId: string;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getProducts = async (): Promise<ProductSummary[]> => {
  const response = await api.get<ApiResponse<ProductSummary[]>>("/products");

  return response.data.data;
};

export const getProduct = async (id: string): Promise<ProductDetail> => {
  const response = await api.get<ApiResponse<ProductDetail>>(`/products/${id}`);

  return response.data.data;
};

export const createProduct = async (
  request: ProductFormRequest,
): Promise<CreatedProduct> => {
  const response = await api.post<ApiResponse<CreatedProduct>>(
    "/products",
    request,
  );

  return response.data.data;
};

export const updateProduct = async (
  id: string,
  request: ProductFormRequest,
): Promise<CreatedProduct> => {
  const response = await api.put<ApiResponse<CreatedProduct>>(
    `/products/${id}`,
    request,
  );

  return response.data.data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete(`/products/${id}`);
};
