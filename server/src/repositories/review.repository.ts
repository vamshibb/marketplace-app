import { userSummarySelect } from "./user.select";
import { ReviewUpdate } from "../validators/reviewValidators";
import { prisma } from "../prisma/client";

export const findProductReviewStatus = (orderId: string, userId: string) => {
  return prisma.review.findUnique({
    where: { orderId, userId },
    select: { id: true },
  });
};

export const createReview = (
  orderId: string,
  userId: string,
  productId: string,
  rating: number,
  comment?: string
) => {
  return prisma.review.create({
    data: {
      orderId,
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
        select: userSummarySelect,
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
  data: ReviewUpdate
) => {
  return prisma.review.update({
    where: { id },
    data: { rating: data.rating, comment: data.comment },
  });
};

export const deleteReview = (
  id: string
) => {
  return prisma.review.delete({
    where: { id },
  });
};
