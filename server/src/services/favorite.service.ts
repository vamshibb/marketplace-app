import * as favoriteRepository from "../repositories/favorite.repository";

export const addFavorite = (
  userId: string,
  productId: string
) => {
  return favoriteRepository.addFavorite(
    userId,
    productId
  );
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
