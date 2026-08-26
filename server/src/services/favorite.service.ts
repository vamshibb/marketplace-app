import * as favoriteRepository from "../repositories/favorite.repository";
import { AppError } from "../errors/AppError";

export const addFavorite = async (
  userId: string,
  productId: string
) => {
  try {
    return await favoriteRepository.addFavorite(userId, productId);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new AppError("Product already in favorites", 409);
    }

    throw error;
  }
};

export const removeFavorite = (
  userId: string,
  productId: string
) => {
  return favoriteRepository.removeFavorite(
    userId,
    productId
  );
};

export const getFavorites = (
  userId: string
) => {
  return favoriteRepository.getFavorites(userId);
};
