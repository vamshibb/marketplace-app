import { z } from "zod";

export const productIdParamSchema = z.union([
  z.object({
    id: z.cuid(),
  }),
  z.object({
    productId: z.cuid(),
  }),
]);

export const reviewIdParamSchema = z.object({
  reviewId: z.cuid(),
});

export const mediaIdParamSchema = z.object({
  mediaId: z.cuid(),
});

export const categoryIdParamSchema = z.object({
  id: z.cuid(),
});
