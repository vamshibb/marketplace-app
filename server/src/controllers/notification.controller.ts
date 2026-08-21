import {
  NextFunction,
  Response,
} from "express";

import { AuthRequest } from "../middleware/authMiddleware";
import * as notificationService from "../services/notification.service";
import { successResponse } from "../utils/apiResponse";

export const getNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const notifications =
      await notificationService.getNotifications(
        req.user!.id
      );

    return res.status(200).json(
      successResponse(notifications)
    );
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const count = await notificationService.getUnreadCount(
      req.user!.id
    );

    return res.status(200).json(
      successResponse({ count })
    );
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const notification =
      await notificationService.markAsRead(
        req.params.notificationId,
        req.user!.id
      );

    return res.status(200).json(
      successResponse(
        notification,
        "Notification marked as read"
      )
    );
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await notificationService.markAllAsRead(
      req.user!.id
    );

    return res.status(200).json(
      successResponse(
        { updatedCount: result.count },
        "All notifications marked as read"
      )
    );
  } catch (error) {
    next(error);
  }
};
