import {
  NextFunction,
  Response,
} from "express";

import { AuthRequest } from "../middleware/authMiddleware";
import * as conversationService from "../services/conversation.service";
import { successResponse } from "../utils/apiResponse";

export const createConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const conversation =
      await conversationService.createConversation(
        req.params.productId,
        req.user!.id
      );

    return res.status(201).json(
      successResponse(
        conversation,
        "Conversation created successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getUserConversations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const conversations =
      await conversationService.getUserConversations(
        req.user!.id
      );

    return res.status(200).json(
      successResponse(conversations)
    );
  } catch (error) {
    next(error);
  }
};

export const getConversationById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const conversation =
      await conversationService.getConversationById(
        req.params.conversationId,
        req.user!.id
      );

    return res.status(200).json(
      successResponse(conversation)
    );
  } catch (error) {
    next(error);
  }
};
