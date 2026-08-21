import { z } from "zod";

export const createOrderBodySchema = z.object({
  quantity: z.coerce.number().int().min(1).optional(),
  requestedFrom: z.coerce.date().optional(),
  requestedTo: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const productOrderParamsSchema = z.object({
  productId: z.string().trim().min(1),
});

export const orderParamsSchema = z.object({
  orderId: z.string().trim().min(1),
});
