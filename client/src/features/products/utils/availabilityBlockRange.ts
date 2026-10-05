import { addDays, utcToday, type AvailabilityDay } from "../../orders/availability";
import { availabilityBlockSchema } from "../schemas/availabilityBlockSchema";

export const blockRangeError = (totalQuantity: number, quantity: number, from: string, to: string, days: ReadonlyMap<string, AvailabilityDay>): string | null => {
  const result = availabilityBlockSchema(totalQuantity).safeParse({ blockedFrom: from, blockedTo: to, quantity, reason: "" });
  if (!result.success) return result.error.issues[0].message;
  for (let date = from; date < to; date = addDays(date, 1)) {
    const day = days.get(date);
    if (!day) return "Availability for the selected dates has not loaded. Retry any failed months.";
    if (day.availableQuantity < quantity) return `Selected dates do not support quantity ${quantity}. Choose another range or quantity.`;
  }
  return null;
};

export const canSelectBlockDate = (date: string, from: string, to: string, quantity: number, totalQuantity: number, days: ReadonlyMap<string, AvailabilityDay>): boolean => {
  if (date < utcToday() || !Number.isInteger(quantity) || quantity < 1 || quantity > totalQuantity) return false;
  if (from && !to) return blockRangeError(totalQuantity, quantity, from, date, days) === null;
  return (days.get(date)?.availableQuantity ?? 0) >= quantity;
};
