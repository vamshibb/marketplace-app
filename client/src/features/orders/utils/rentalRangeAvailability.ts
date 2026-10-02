import type { AvailabilityDay } from "../availabilityTypes";
import type { OrderRequestProduct } from "../components/RequestOrderButton";
import { createOrderRequestSchema } from "../schemas/orderRequestSchema";
import { addDays } from "./rentalCalendarDates";

export const rentalRangeError = (
  product: OrderRequestProduct, quantity: number, from: string | undefined, to: string | undefined,
  availability: ReadonlyMap<string, AvailabilityDay>,
): string | null => {
  const result = createOrderRequestSchema(product).safeParse({ quantity, requestedFrom: from, requestedTo: to });
  if (!result.success) return result.error.issues[0].message;
  if (!from || !to) return "Choose a start and return date.";
  for (let date = from; date < to; date = addDays(date, 1)) {
    const day = availability.get(date);
    if (!day) return "Availability for the selected dates is still loading.";
    if (day.availableQuantity < quantity) return `Selected dates do not support quantity ${quantity}. Choose another range or quantity.`;
  }
  return null;
};
