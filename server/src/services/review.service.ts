import * as reviewRepository from "../repositories/review.repository";
import * as productRepository from "../repositories/product.repository";
import { AppError } from "../errors/AppError";

const validateReviewOwnership = async (
  id: string,
  userId: string
) => {
  const review = await getReviewById(id);

  if (review.userId !== userId) {
    throw new AppError(
      "You are not authorized to modify this review.",
      403
    );
  }
};

export const createReview = (
  userId: string,
  productId: string,
  rating: number,
  comment?: string
) => {
  return reviewRepository.createReview(
    userId,
    productId,
    rating,
    comment
  );
};

export const getProductReviews = async (
  productId: string
) => {
  const product = await productRepository.findProductOwner(productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return reviewRepository.getProductReviews(
    productId
  );
};

export const getReviewById = async (
  id: string
) => {
  const review = await reviewRepository.getReviewById(id);

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  return review;
};

export const updateReview = async (
  id: string,
  data: Parameters<typeof reviewRepository.updateReview>[1],
  userId: string
) => {
  await validateReviewOwnership(id, userId);

  return reviewRepository.updateReview(id, data);
};

export const deleteReview = async (
  id: string,
  userId: string
) => {
  await validateReviewOwnership(id, userId);

  return reviewRepository.deleteReview(id);
};
