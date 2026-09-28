import * as reviewRepository from "../repositories/review.repository";
import { getCompletedReviewOrder, translateReviewConflict } from "./reviewEligibility";
import * as productRepository from "../repositories/product.repository";
import { AppError } from "../errors/AppError";
import * as orderRepository from "../repositories/order.repository";
import * as userReviewRepository from "../repositories/userReview.repository";
import type { OrderReviewStatusDTO } from "../dto/reviewStatus.dto";

export const getOrderReviewStatus = async (
  orderId: string,
  userId: string
): Promise<OrderReviewStatusDTO> => {
  const order = await orderRepository.findOrderById(orderId);
  if (!order) throw new AppError("Order not found", 404);
  if (order.buyerId !== userId && order.sellerId !== userId) {
    throw new AppError("Only order participants can view review status", 403);
  }

  const [productReview, userReview] = await Promise.all([
    reviewRepository.findProductReviewStatus(orderId, userId),
    userReviewRepository.findUserReviewStatus(orderId, userId),
  ]);
  const eligible = order.status === "COMPLETED" && order.buyerId !== order.sellerId;
  return {
    productReview: {
      eligible: eligible && order.buyerId === userId,
      submitted: productReview !== null,
      reviewId: productReview?.id ?? null,
    },
    userReview: {
      eligible,
      submitted: userReview !== null,
      reviewId: userReview?.id ?? null,
    },
  };
};

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

export const createReview = async (
  userId: string,
  orderId: string,
  rating: number,
  comment?: string
) => {
  const order = await getCompletedReviewOrder(orderId, userId);
  if (order.buyerId !== userId || order.sellerId === userId) {
    throw new AppError("Only the buyer can create a product review for this order", 403);
  }
  try {
    return await reviewRepository.createReview(order.id, userId, order.productId, rating, comment);
  } catch (error) {
    return translateReviewConflict(error, "A product review already exists for this order");
  }
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
