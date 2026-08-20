import { Router } from "express";

import * as conversationController from "../controllers/conversation.controller";
import { authMiddleware } from "../middleware/authMiddleware";
import { validate } from "../middleware/validationMiddleware";
import {
  createConversationParamsSchema,
  getConversationParamsSchema,
} from "../validators/conversation.validator";

const router = Router();

router.post(
  "/products/:productId/conversations",
  authMiddleware,
  validate(createConversationParamsSchema, "params"),
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

export default router;
