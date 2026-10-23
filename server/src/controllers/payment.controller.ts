import {
    NextFunction,
    Request,
    Response,
} from "express";

import { AuthRequest } from "../middleware/authMiddleware";
import { AppError } from "../errors/AppError";
import * as paymentService from "../services/payment.service";
import { getConfiguredPaymentProvider } from "../services/paymentProvider";
import { toPaymentResponseDto } from "../dto/payment.dto";
import { successResponse } from "../utils/apiResponse";

export const authorizeOrderPayment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const payment = await paymentService.authorizeOrderPayment(
            req.params.orderId,
            req.user!.id,
            getConfiguredPaymentProvider()
        );

        return res.status(200).json(
            successResponse(toPaymentResponseDto(payment), "Payment authorized successfully")
        );
    } catch (error) {
        next(error);
    }
};

export const handleWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const providerName = req.params.provider?.trim();
        if (!providerName) {
            return next(new AppError("Provider name is required.", 400));
        }

        const provider = getConfiguredPaymentProvider();
        const result = await paymentService.processWebhookEvent(
            providerName,
            req.body as Buffer | string,
            req.headers,
            provider
        );

        if (result.acknowledged === false && result.retryable) {
            return res.status(503).json({
                success: false,
                message: "Webhook retry required",
                data: result,
            });
        }

        return res
            .status(200)
            .json(successResponse(result, "Webhook processed"));
    } catch (error) {
        next(error);
    }
};
