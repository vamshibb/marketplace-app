import {
    NextFunction,
    Response,
} from "express";

import { AuthRequest } from "../middleware/authMiddleware";
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