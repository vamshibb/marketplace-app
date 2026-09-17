import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { authQueryKeys, getCurrentUser, useAuthStore } from "../../auth";
import { addFavorite, removeFavorite } from "../api/favoritesApi";
import type { FavoriteWithProduct } from "../favoriteTypes";
import { favoritesQueryKeys } from "../favoritesQueryKeys";
import type { ProductSummary } from "../types";
import { favoritesQueryOptions } from "./useFavoritesQuery";

export const useToggleFavoriteMutation = (product: ProductSummary) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: favoritesQueryKeys.toggle(product.id),
    mutationFn: async ({ saveOnly = false }: { saveOnly?: boolean }) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error("Please sign in to save products.");
      // Resolve identity and membership now, rather than capturing guest state.
      const user = await queryClient.ensureQueryData({
        queryKey: authQueryKeys.currentUser(),
        queryFn: getCurrentUser,
      });
      if (product.sellerId === user.id) throw new Error("You cannot save your own listing.");
      const favorites = await queryClient.fetchQuery(favoritesQueryOptions(user.id));
      if (useAuthStore.getState().token !== token) throw new Error("Your session changed. Please try again.");
      const existing = favorites.find((item) => item.productId === product.id);
      // A guest's original action is a save, even if their account already saved it.
      if (saveOnly && existing) return { userId: user.id, favorite: existing };
      if (existing) {
        await removeFavorite(product.id);
        return { userId: user.id, favorite: null };
      }
      const favorite = await addFavorite(product.id);
      return { userId: user.id, favorite: { ...favorite, product } };
    },
    onSuccess: async ({ userId, favorite }) => {
      const queryKey = favoritesQueryKeys.list(userId);
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<FavoriteWithProduct[]>(queryKey, (current = []) => {
        const remaining = current.filter((item) => item.productId !== product.id);
        return favorite ? [...remaining, favorite] : remaining;
      });
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast.error(error.message || "Unable to update your wishlist.");
      void queryClient.invalidateQueries({ queryKey: favoritesQueryKeys.lists() });
    },
  });
};
