import { Router } from "express";

import * as orderController from "../controllers/order.controller";
import { authMiddleware } from "../middleware/authMiddleware";
import { validate } from "../middleware/validationMiddleware";
import {
  createOrderBodySchema,
  orderParamsSchema,
  productOrderParamsSchema,
} from "../validators/order.validator";

import { createReview, getOrderReviewStatus } from "../controllers/review.controller";
import { createReview as createUserReview } from "../controllers/userReview.controller";
import { createReviewSchema } from "../validators/reviewValidators";

const router = Router();

router.get("/orders/:orderId/reviews/status", authMiddleware,
  validate(orderParamsSchema, "params"), getOrderReviewStatus);

router.post("/orders/:orderId/reviews/product", authMiddleware,
  validate(orderParamsSchema, "params"), validate(createReviewSchema), createReview);
router.post("/orders/:orderId/reviews/user", authMiddleware,
  validate(orderParamsSchema, "params"), validate(createReviewSchema), createUserReview);


router.post(
  "/orders/products/:productId",
  authMiddleware,
  validate(productOrderParamsSchema, "params"),
  validate(createOrderBodySchema, "body"),
  orderController.createOrder
);

router.get(
  "/orders/buyer",
  authMiddleware,
  orderController.getBuyerOrders
);

router.get(
  "/orders/seller",
  authMiddleware,
  orderController.getSellerOrders
);

router.get(
  "/orders/:orderId",
  authMiddleware,
  validate(orderParamsSchema, "params"),
  orderController.getOrder
);

router.patch(
  "/orders/:orderId/accept",
  authMiddleware,
  validate(orderParamsSchema, "params"),
  orderController.acceptOrder
);

router.patch(
  "/orders/:orderId/reject",
  authMiddleware,
  validate(orderParamsSchema, "params"),
  orderController.rejectOrder
);

router.patch(
  "/orders/:orderId/cancel",
  authMiddleware,
  validate(orderParamsSchema, "params"),
  orderController.cancelOrder
);

router.patch(
  "/orders/:orderId/complete",
  authMiddleware,
  validate(orderParamsSchema, "params"),
  orderController.completeOrder
);

router.patch(
  "/orders/:orderId/start",
  authMiddleware,
  validate(orderParamsSchema, "params"),
  orderController.startRental
);

router.patch(
  "/orders/:orderId/return",
  authMiddleware,
  validate(orderParamsSchema, "params"),
  orderController.returnRental
);

router.patch(
  "/orders/:orderId/confirm-return",
  authMiddleware,
  validate(orderParamsSchema, "params"),
  orderController.confirmRentalReturn
);

export default router;
