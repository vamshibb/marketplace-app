import * as orderRepository from "../repositories/order.repository";
import { AppError } from "../errors/AppError";

export const getCompletedReviewOrder = async (orderId: string, userId: string) => {
  const order = await orderRepository.findOrderById(orderId);
  if (!order) throw new AppError("Order not found", 404);
  if (order.buyerId !== userId && order.sellerId !== userId) {
    throw new AppError("Only order participants can review this transaction", 403);
  }
  if (order.status !== "COMPLETED") {
    throw new AppError("Only COMPLETED orders can be reviewed", 409);
  }
  return order;
};

export const translateReviewConflict = (error: unknown, message: string): never => {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
    throw new AppError(message, 409);
  }
  throw error;
};
