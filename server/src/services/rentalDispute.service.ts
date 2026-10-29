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
    if (!reason || !reason.trim()) {
        throw new AppError(
            "Dispute reason is required.",
            400
        );
    }

    const result =
        await rentalDisputeRepository.openRentalDisputeAtomically({
            orderId,
            openedById: userId,
            reason: reason.trim(),
            details: details?.trim() || null,
        });

    switch (result.kind) {
        case "opened":
            return result.dispute;

        case "not-found":
            throw new AppError(
                "Order not found",
                404
            );

        case "not-rental":
            throw new AppError(
                "Only rental orders can have disputes opened.",
                409
            );

        case "wrong-status":
            throw new AppError(
                "Only return-pending rental orders can have disputes opened.",
                409
            );

        case "forbidden":
            throw new AppError(
                "You are not authorized to perform this action.",
                403
            );

        case "existing":
            throw new AppError(
                "A dispute already exists for this order.",
                409
            );

        case "conflict":
            throw new AppError(
                "Rental dispute state changed concurrently. Please refresh and try again.",
                409
            );
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
        throw new AppError(
            "Rental dispute not found.",
            404
        );
    }

    if (dispute.status !== RentalDisputeStatus.OPEN) {
        throw new AppError(
            "Only open rental disputes can be resolved.",
            409
        );
    }

    const order =
        await orderRepository.findOrderById(
            dispute.orderId
        );

    if (!order) {
        throw new AppError(
            "Order not found",
            404
        );
    }

    if (order.transactionType !== "RENT") {
        throw new AppError(
            "Rental dispute resolution is only valid for RENT orders.",
            409
        );
    }

    const claimed =
        await rentalDisputeRepository.claimRentalDisputeForResolution(
            dispute.id
        );

    if (!claimed) {
        throw new AppError(
            "Rental dispute state changed concurrently. Please refresh and try again.",
            409
        );
    }

    try {
        if (
            resolution ===
            RentalDisputeResolution.RELEASE_DEPOSIT
        ) {
            await releaseRentalDeposit(
                dispute.orderId,
                paymentProvider
            );
        } else if (
            resolution ===
            RentalDisputeResolution.CAPTURE_DEPOSIT
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
    } catch (error) {
        await rentalDisputeRepository
            .reopenRentalDisputeAfterResolutionFailure(
                dispute.id
            );

        throw error;
    }

    const resolved =
        await rentalDisputeRepository
            .finalizeRentalDisputeResolution(
                dispute.id,
                resolution,
                new Date()
            );

    if (!resolved) {
        throw new AppError(
            "Rental dispute state changed while finalizing resolution.",
            409
        );
    }

    return resolved;
};
export const getRentalDisputeForOrder = async (
    orderId: string,
    userId: string
) => {
    const order = await orderRepository.findOrderById(orderId);

    if (!order) {
        throw new AppError("Order not found", 404);
    }

    if (order.transactionType !== "RENT") {
        throw new AppError(
            "Rental disputes are only available for RENT orders.",
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

    const dispute =
        await rentalDisputeRepository.findRentalDisputeByOrderId(
            orderId
        );

    if (!dispute) {
        throw new AppError("Rental dispute not found.", 404);
    }

    return dispute;
};

export const cancelRentalDispute = async (
    orderId: string,
    userId: string
) => {
    const dispute =
        await rentalDisputeRepository
            .findRentalDisputeByOrderId(
                orderId
            );

    if (!dispute) {
        throw new AppError(
            "Rental dispute not found.",
            404
        );
    }

    if (dispute.openedById !== userId) {
        throw new AppError(
            "Only the user who opened the dispute can cancel it.",
            403
        );
    }

    if (dispute.status !== RentalDisputeStatus.OPEN) {
        throw new AppError(
            "Only open rental disputes can be cancelled.",
            409
        );
    }

    const cancelled =
        await rentalDisputeRepository.cancelRentalDispute(
            dispute.id,
            userId
        );

    if (!cancelled) {
        throw new AppError(
            "Rental dispute state changed concurrently. Please refresh and try again.",
            409
        );
    }

    return cancelled;
};