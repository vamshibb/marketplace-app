import { prisma } from "../prisma/client";
import { productSummaryInclude } from "./product.repository";

export const addFavorite = (
  userId: string,
  productId: string
) => {
  return prisma.favorite.create({
    data: {
      userId,
      productId,
    },
  });
};

export const removeFavorite = (
  userId: string,
  productId: string
) => {
  return prisma.favorite.delete({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });
};

export const getFavorites = (
  userId: string
) => {
  return prisma.favorite.findMany({
    where: {
      userId,
    },
    include: {
      product: {
        include: productSummaryInclude,
      },
    },
  });
};
