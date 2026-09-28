import * as repository from "../repositories/userReview.repository";
import { AppError } from "../errors/AppError";
import { ReviewUpdate } from "../validators/reviewValidators";
import { getCompletedReviewOrder, translateReviewConflict } from "./reviewEligibility";

export const createUserReview = async (
  reviewerId: string, orderId: string, rating: number, comment?: string
) => {
  const order = await getCompletedReviewOrder(orderId, reviewerId);
  const revieweeId = reviewerId === order.buyerId ? order.sellerId : order.buyerId;
  if (reviewerId === revieweeId) throw new AppError("You cannot review yourself", 403);
  try {
    return await repository.createUserReview(order.id, reviewerId, revieweeId, rating, comment);
  } catch (error) {
    return translateReviewConflict(error, "You already reviewed this user for this order");
  }
};

const validateOwnership = async (id: string, userId: string) => {
  const review = await repository.getUserReviewById(id);
  if (!review) throw new AppError("User review not found", 404);
  if (review.reviewerId !== userId) throw new AppError("You are not authorized to modify this review.", 403);
};

export const updateUserReview = async (id: string, data: ReviewUpdate, userId: string) => {
  await validateOwnership(id, userId);
  return repository.updateUserReview(id, data);
};

export const deleteUserReview = async (id: string, userId: string) => {
  await validateOwnership(id, userId);
  return repository.deleteUserReview(id);
};
