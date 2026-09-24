import { Router } from "express";

import * as conversationController from "../controllers/conversation.controller";
import { authMiddleware } from "../middleware/authMiddleware";
import { validate } from "../middleware/validationMiddleware";
import {
  createConversationParamsSchema,
  getConversationParamsSchema,
  markConversationReadSchema,
} from "../validators/conversation.validator";

import { sendMessageSchema } from "../validators/message.validator";

const router = Router();

router.post(
  "/products/:productId/conversations",
  authMiddleware,
  validate(createConversationParamsSchema, "params"),
  validate(sendMessageSchema),
  conversationController.createConversation
);

router.get(
  "/conversations",
  authMiddleware,
  conversationController.getUserConversations
);

router.get(
  "/conversations/:conversationId",
  authMiddleware,
  validate(getConversationParamsSchema, "params"),
  conversationController.getConversationById
);

router.patch(
  "/conversations/:conversationId/read",
  authMiddleware,
  validate(getConversationParamsSchema, "params"),
  validate(markConversationReadSchema),
  conversationController.markConversationRead
);

export default router;
