import { api } from "../../../shared/api/axios";
import type { ApiResponse } from "../../../shared/types/api";
import type { Category } from "../types";

export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get<ApiResponse<Category[]>>("/categories");

  return response.data.data;
};
