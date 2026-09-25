import { z } from "zod";
import type { OrderRequestProduct } from "../components/RequestOrderButton";
import { rentalDuration } from "../utils/rentalDuration";
export const orderRequestSchema = z.object({
  quantity: z.number({ error: "Enter a quantity." }).int("Quantity must be a whole number.").positive("Quantity must be at least 1."),
  notes: z.string().trim().max(1000, "Notes must be 1000 characters or fewer.").optional(),
  requestedFrom: z.string().optional(),
  requestedTo: z.string().optional(),
});
export const createOrderRequestSchema = (product: OrderRequestProduct) => orderRequestSchema.superRefine((values, context) => {
  if (product.listingType !== "RENT") return;
  if (!values.requestedFrom) context.addIssue({ code: "custom", path: ["requestedFrom"], message: "From date is required." });
  if (!values.requestedTo) context.addIssue({ code: "custom", path: ["requestedTo"], message: "Return date is required." });
  if (values.requestedFrom && values.requestedTo) {
    const days = rentalDuration(values.requestedFrom, values.requestedTo);
    if (days === null) context.addIssue({ code: "custom", path: ["requestedTo"], message: "Choose valid dates with return after the start date." });
    else if (product.minRentalDays != null && days < product.minRentalDays) context.addIssue({ code: "custom", path: ["requestedTo"], message: `Minimum rental duration is ${product.minRentalDays} days.` });
    else if (product.maxRentalDays != null && days > product.maxRentalDays) context.addIssue({ code: "custom", path: ["requestedTo"], message: `Maximum rental duration is ${product.maxRentalDays} days.` });
  }
  if (values.quantity > product.quantityAvailable) context.addIssue({ code: "custom", path: ["quantity"], message: `Only ${product.quantityAvailable} available.` });
});
export type OrderRequestValues = z.infer<typeof orderRequestSchema>;
