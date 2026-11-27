import {
    NextFunction,
    Response,
} from "express";

import { AppError } from "../errors/AppError";
import { RentalDisputeResolution } from "../generated/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import { getConfiguredPaymentProvider } from "../services/paymentProvider";
import * as rentalDisputeService from "../services/rentalDispute.service";
import { successResponse } from "../utils/apiResponse";

export const openDispute = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const reason =
            typeof req.body?.reason === "string"
                ? req.body.reason
                : "";

        const details =
            typeof req.body?.details === "string"
                ? req.body.details
                : undefined;

        const dispute =
            await rentalDisputeService.openRentalDispute(
                req.params.orderId,
                req.user!.id,
                reason,
                details
            );

        return res.status(201).json(
            successResponse(
                dispute,
                "Rental dispute opened successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

export const getDispute = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const dispute =
            await rentalDisputeService.getRentalDisputeForOrder(
                req.params.orderId,
                req.user!.id
            );

        return res.status(200).json(
            successResponse(dispute)
        );
    } catch (error) {
        next(error);
    }
};

export const cancelDispute = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const dispute =
            await rentalDisputeService.cancelRentalDispute(
                req.params.orderId,
                req.user!.id
            );

        return res.status(200).json(
            successResponse(
                dispute,
                "Rental dispute cancelled successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

export const resolveDispute = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { disputeId } = req.params;
        const resolution: unknown = req.body?.resolution;

        if (
            resolution !== RentalDisputeResolution.CAPTURE_DEPOSIT &&
            resolution !== RentalDisputeResolution.RELEASE_DEPOSIT
        ) {
            throw new AppError("Invalid rental dispute resolution", 400);
        }

        const dispute = await rentalDisputeService.resolveRentalDispute(
            disputeId,
            resolution,
            getConfiguredPaymentProvider()
        );

        return res.status(200).json(successResponse(dispute));
    } catch (error) {
        next(error);
    }
};
