import { api } from "./api";

import type { Product } from "../types/product";
import type { PaginatedResponse } from "../types/api";

export const getProducts = async (): Promise<
  PaginatedResponse<Product[]>
> => {
  const response =
    await api.get<PaginatedResponse<Product[]>>(
      "/products"
    );

  return response.data;
};