import { api } from "../../../shared/api/axios";
import type { ApiResponse } from "../../../shared/types/api";
import type { Favorite, FavoriteWithProduct } from "../favoriteTypes";

export const getFavorites = async (signal?: AbortSignal): Promise<FavoriteWithProduct[]> => {
  const response = await api.get<ApiResponse<FavoriteWithProduct[]>>("/favorites", { signal });
  return response.data.data;
};

export const addFavorite = async (productId: string): Promise<Favorite> => {
  const response = await api.post<ApiResponse<Favorite>>(`/favorites/${productId}`);
  return response.data.data;
};

export const removeFavorite = async (productId: string): Promise<void> => {
  await api.delete(`/favorites/${productId}`);
};
