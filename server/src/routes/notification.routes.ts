import { Router } from "express";

import * as notificationController from "../controllers/notification.controller";
import { authMiddleware } from "../middleware/authMiddleware";
import { validate } from "../middleware/validationMiddleware";
import { markNotificationAsReadParamsSchema } from "../validators/notification.validator";

const router = Router();

router.get(
  "/notifications",
  authMiddleware,
  notificationController.getNotifications
);

router.get(
  "/notifications/unread-count",
  authMiddleware,
  notificationController.getUnreadCount
);

router.patch(
  "/notifications/read-all",
  authMiddleware,
  notificationController.markAllAsRead
);

router.patch(
  "/notifications/:notificationId/read",
  authMiddleware,
  validate(markNotificationAsReadParamsSchema, "params"),
  notificationController.markAsRead
);

export default router;
