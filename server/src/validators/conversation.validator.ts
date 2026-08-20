import { z } from "zod";

export const createConversationParamsSchema = z.object({
  productId: z.string().trim().min(1),
});

export const getConversationParamsSchema = z.object({
  conversationId: z.string().trim().min(1),
});
