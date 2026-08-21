import { Router } from "express";

import * as notificationController from "../controllers/notification.controller";
import { authMiddleware } from "../middleware/authMiddleware";

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
  notificationController.markAsRead
);

export default router;
