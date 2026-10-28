import {
    OrderStatus,
    Prisma,
    RentalDisputeResolution,
    RentalDisputeStatus,
} from "../generated/prisma";
import { AppError } from "../errors/AppError";
import * as orderRepository from "../repositories/order.repository";
import * as rentalDisputeRepository from "../repositories/rentalDispute.repository";
import {
    captureRentalDeposit,
    releaseRentalDeposit,
} from "./payment.service";
import type { PaymentProvider } from "./paymentProvider";

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
        throw new AppError(
            "Only rental orders can have disputes opened.",
            409
        );
    }

    if (order.status !== OrderStatus.RETURN_PENDING) {
        throw new AppError(
            "Only return-pending rental orders can have disputes opened.",
            409
        );
    }

    if (
        order.buyerId !== userId &&
        order.sellerId !== userId
    ) {
        throw new AppError(
            "You are not authorized to perform this action.",
            403
        );
    }

    const existing =
        await rentalDisputeRepository.findRentalDisputeByOrderId(
            orderId
        );

    if (existing) {
        throw new AppError(
            "A dispute already exists for this order.",
            409
        );
    }

    if (!reason || !reason.trim()) {
        throw new AppError(
            "Dispute reason is required.",
            400
        );
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
            throw new AppError(
                "A dispute already exists for this order.",
                409
            );
        }

        throw error;
    }
};

export const resolveRentalDispute = async (
    disputeId: string,
    resolution: RentalDisputeResolution,
    paymentProvider: PaymentProvider
) => {
    const dispute =
        await rentalDisputeRepository.findRentalDisputeById(
            disputeId
        );

    if (!dispute) {
        throw new AppError("Rental dispute not found.", 404);
    }

    if (dispute.status !== RentalDisputeStatus.OPEN) {
        throw new AppError(
            "Only open rental disputes can be resolved.",
            409
        );
    }

    const order = await orderRepository.findOrderById(
        dispute.orderId
    );

    if (!order) {
        throw new AppError("Order not found", 404);
    }

    if (order.transactionType !== "RENT") {
        throw new AppError(
            "Rental dispute resolution is only valid for RENT orders.",
            409
        );
    }

    if (
        resolution === RentalDisputeResolution.RELEASE_DEPOSIT
    ) {
        await releaseRentalDeposit(
            dispute.orderId,
            paymentProvider
        );
    } else if (
        resolution === RentalDisputeResolution.CAPTURE_DEPOSIT
    ) {
        await captureRentalDeposit(
            dispute.orderId,
            paymentProvider
        );
    } else {
        throw new AppError(
            "Unsupported rental dispute resolution.",
            400
        );
    }

    return rentalDisputeRepository.resolveRentalDispute(
        dispute.id,
        resolution,
        new Date()
    );
};