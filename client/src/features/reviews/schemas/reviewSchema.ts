import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.number().int().min(1, "Choose a star rating.").max(5),
  comment: z.string().max(1000, "Comment must be at most 1000 characters.").optional(),
});

export type ReviewValues = z.infer<typeof reviewSchema>;
