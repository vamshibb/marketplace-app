import { prisma } from "../prisma/client";
import { ReviewUpdate } from "../validators/reviewValidators";

export const createUserReview = (
  orderId: string, reviewerId: string, revieweeId: string, rating: number, comment?: string
) => prisma.userReview.create({ data: { orderId, reviewerId, revieweeId, rating, comment } });

export const getUserReviewById = (id: string) => prisma.userReview.findUnique({ where: { id } });

export const updateUserReview = (id: string, data: ReviewUpdate) => prisma.userReview.update({
  where: { id }, data: { rating: data.rating, comment: data.comment },
});

export const deleteUserReview = (id: string) => prisma.userReview.delete({ where: { id } });
