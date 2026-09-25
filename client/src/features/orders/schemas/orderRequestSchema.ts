import { z } from "zod";
export const orderRequestSchema = z.object({
  quantity: z.number({ error: "Enter a quantity." }).int("Quantity must be a whole number.").positive("Quantity must be at least 1."),
  notes: z.string().trim().max(1000, "Notes must be 1000 characters or fewer.").optional(),
});
export type OrderRequestValues = z.infer<typeof orderRequestSchema>;

