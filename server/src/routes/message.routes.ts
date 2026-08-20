import { Router } from "express";

import * as messageController from "../controllers/message.controller";
import { authMiddleware } from "../middleware/authMiddleware";
import { validate } from "../middleware/validationMiddleware";
import {
  getConversationMessagesParamsSchema,
  sendMessageSchema,
} from "../validators/message.validator";

const router = Router();

router.post(
  "/conversations/:conversationId/messages",
  authMiddleware,
  validate(getConversationMessagesParamsSchema, "params"),
  validate(sendMessageSchema),
  messageController.sendMessage
);

router.get(
  "/conversations/:conversationId/messages",
  authMiddleware,
  validate(getConversationMessagesParamsSchema, "params"),
  messageController.getConversationMessages
);

export default router;
