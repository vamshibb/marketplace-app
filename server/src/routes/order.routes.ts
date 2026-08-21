import { Router } from "express";

import * as orderController from "../controllers/order.controller";
import { authMiddleware } from "../middleware/authMiddleware";
import { validate } from "../middleware/validationMiddleware";
import {
  createOrderBodySchema,
  orderParamsSchema,
  productOrderParamsSchema,
} from "../validators/order.validator";

const router = Router();

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

export default router;
