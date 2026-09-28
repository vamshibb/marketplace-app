import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
}).strict();

export const updateReviewSchema = createReviewSchema.partial();
export type ReviewUpdate = z.infer<typeof updateReviewSchema>;
