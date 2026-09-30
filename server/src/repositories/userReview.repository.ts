import { prisma } from "../prisma/client";
import { ReviewUpdate } from "../validators/reviewValidators";
import { userSummarySelect } from "./user.select";

export const findReceivedUserReviews = (revieweeId: string) => prisma.userReview.findMany({
  where: { revieweeId },
  select: {
    id: true,
    rating: true,
    comment: true,
    createdAt: true,
    reviewer: { select: userSummarySelect },
    order: {
      select: {
        transactionType: true,
        sellerId: true,
        buyerId: true,
        product: { select: { id: true, title: true } },
      },
    },
  },
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
});

export const findUserReviewStatus = (orderId: string, reviewerId: string) => {
  return prisma.userReview.findFirst({
    where: { orderId, reviewerId },
    select: { id: true },
  });
};

export const createUserReview = (
  orderId: string, reviewerId: string, revieweeId: string, rating: number, comment?: string
) => prisma.userReview.create({ data: { orderId, reviewerId, revieweeId, rating, comment } });

export const getUserReviewById = (id: string) => prisma.userReview.findUnique({ where: { id } });

export const updateUserReview = (id: string, data: ReviewUpdate) => prisma.userReview.update({
  where: { id }, data: { rating: data.rating, comment: data.comment },
});

export const deleteUserReview = (id: string) => prisma.userReview.delete({ where: { id } });
