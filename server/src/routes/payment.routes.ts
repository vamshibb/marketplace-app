import { Router } from "express";

import * as paymentController from "../controllers/payment.controller";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post(
    "/orders/:orderId/payments/authorize",
    authMiddleware,
    paymentController.authorizeOrderPayment
);

router.post(
    "/orders/:orderId/payments/deposit/authorize",
    authMiddleware,
    paymentController.authorizeRentalDeposit
);

router.post(
    "/orders/:orderId/payments/sync",
    authMiddleware,
    paymentController.syncOrderPaymentStatus
);

router.post(
    "/payments/webhooks/:provider",
    paymentController.handleWebhook
);

export default router;
