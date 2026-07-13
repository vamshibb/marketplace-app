import { Prisma } from "../generated/prisma";
import { prisma } from "../prisma/client";

export const createReview = (
  userId: string,
  productId: string,
  rating: number,
  comment?: string
) => {
  return prisma.review.create({
    data: {
      userId,
      productId,
      rating,
      comment,
    },
  });
};

export const getProductReviews = (
  productId: string
) => {
  return prisma.review.findMany({
    where: {
      productId,
    },

    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getReviewById = (
  id: string
) => {
  return prisma.review.findUnique({
    where: { id },
  });
};

export const updateReview = (
  id: string,
  data: Prisma.ReviewUpdateInput
) => {
  return prisma.review.update({
    where: { id },
    data,
  });
};

export const deleteReview = (
  id: string
) => {
  return prisma.review.delete({
    where: { id },
  });
};