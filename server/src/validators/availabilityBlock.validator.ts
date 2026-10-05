import { z } from "zod";
import { dateOnly } from "./availability.validator";

export const createAvailabilityBlockSchema = z.object({
  blockedFrom: dateOnly,
  blockedTo: dateOnly,
  quantity: z.number().int().min(1),
  reason: z.string().max(200).optional(),
}).strict().refine(value => value.blockedFrom < value.blockedTo, {
  path: ["blockedTo"], message: "blockedTo must be after blockedFrom.",
});
export const availabilityBlockParamsSchema = z.object({ productId: z.cuid(), blockId: z.cuid() });
export type CreateAvailabilityBlock = z.infer<typeof createAvailabilityBlockSchema>;
