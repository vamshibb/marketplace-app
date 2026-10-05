import { z } from "zod";
import { UTC_DAY_MS } from "../utils/rentalAvailability";

export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Invalid calendar date.");

export const availabilityQuerySchema = z.object({ from: dateOnly, to: dateOnly }).superRefine((value, context) => {
  const days = (Date.parse(`${value.to}T00:00:00.000Z`) - Date.parse(`${value.from}T00:00:00.000Z`)) / UTC_DAY_MS;
  if (days <= 0) context.addIssue({ code: "custom", path: ["to"], message: "to must be after from." });
  if (days > 90) context.addIssue({ code: "custom", path: ["to"], message: "Availability range must not exceed 90 days." });
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
