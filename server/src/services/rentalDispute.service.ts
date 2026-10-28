import { OrderStatus,Prisma,RentalDisputeStatus } from "../generated/prisma";
import { AppError } from "../errors/AppError";
import * as orderRepository from "../repositories/order.repository";
import * as rentalDisputeRepository from "../repositories/rentalDispute.repository";

export const openRentalDispute = async (
    orderId: string,
    userId: string,
    reason: string,
    details?: string
) => {
    const order = await orderRepository.findOrderById(orderId);

    if (!order) {
        throw new AppError("Order not found", 404);
    }

    if (order.transactionType !== "RENT") {
        throw new AppError("Only rental orders can have disputes opened.", 409);
    }

    if (order.status !== OrderStatus.RETURN_PENDING) {
        throw new AppError("Only return-pending rental orders can have disputes opened.", 409);
    }

    if (order.buyerId !== userId && order.sellerId !== userId) {
        throw new AppError("You are not authorized to perform this action.", 403);
    }

    const existing = await rentalDisputeRepository.findRentalDisputeByOrderId(orderId);
    if (existing) {
        throw new AppError("A dispute already exists for this order.", 409);
    }

    if (!reason || !reason.trim()) {
        throw new AppError("Dispute reason is required.", 400);
    }

    try {
    return await rentalDisputeRepository.createRentalDispute({
        orderId,
        openedById: userId,
        reason: reason.trim(),
        details: details?.trim() || null,
        status: RentalDisputeStatus.OPEN,
    });
} catch (error) {
    if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    ) {
        throw new AppError("A dispute already exists for this order.", 409);
    }

    throw error;
}
};
