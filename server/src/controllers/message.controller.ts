import {
  NextFunction,
  Response,
} from "express";

import { AuthRequest } from "../middleware/authMiddleware";
import * as messageService from "../services/message.service";
import { successResponse } from "../utils/apiResponse";

export const sendMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const message = await messageService.sendMessage(
      req.params.conversationId,
      req.user!.id,
      req.body.content
    );

    return res.status(201).json(
      successResponse(
        message,
        "Message sent successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getConversationMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const messages =
      await messageService.getConversationMessages(
        req.params.conversationId,
        req.user!.id
      );

    return res.status(200).json(
      successResponse(messages)
    );
  } catch (error) {
    next(error);
  }
};
