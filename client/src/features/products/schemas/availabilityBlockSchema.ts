import { z } from "zod";
import { rentalDuration, utcToday } from "../../orders/availability";

export const availabilityBlockSchema = (totalQuantity: number) => z.object({
  blockedFrom: z.string().min(1, "Choose a start date."),
  blockedTo: z.string().min(1, "Choose an end date."),
  quantity: z.number({ error: "Enter a quantity." }).int("Quantity must be a whole number.").min(1, "Quantity must be at least 1.").max(totalQuantity, `Only ${totalQuantity} available.`),
  reason: z.string().trim().max(200, "Reason must be 200 characters or fewer."),
}).superRefine((values, context) => {
  if (values.blockedFrom && values.blockedFrom < utcToday()) context.addIssue({ code: "custom", path: ["blockedFrom"], message: "Start date cannot be in the past (UTC)." });
  if (values.blockedFrom && values.blockedTo && rentalDuration(values.blockedFrom, values.blockedTo) === null) {
    context.addIssue({ code: "custom", path: ["blockedTo"], message: "Choose valid dates with end after start." });
  }
});
export type AvailabilityBlockValues = z.infer<ReturnType<typeof availabilityBlockSchema>>;
