import * as reviewRepository from "../repositories/review.repository";

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

export const getProductReviews = (
  productId: string
) => {
  return reviewRepository.getProductReviews(
    productId
  );
};

export const getReviewById = (
  id: string
) => {
  return reviewRepository.getReviewById(id);
};

export const updateReview = (
  id: string,
  data: Parameters<typeof reviewRepository.updateReview>[1]
) => {
  return reviewRepository.updateReview(id, data);
};

export const deleteReview = (
  id: string
) => {
  return reviewRepository.deleteReview(id);
};
