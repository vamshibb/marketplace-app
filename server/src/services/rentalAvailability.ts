import type { AvailabilityDayDTO } from "../dto/availability.dto";

export const UTC_DAY_MS = 86_400_000;

interface Reservation {
  requestedFrom: Date | null;
  requestedTo: Date | null;
  quantity: number;
}

const utcDay = (date: Date): number => {
  const normalized = new Date(date);
  return normalized.setUTCHours(0, 0, 0, 0);
};

// Pure calculation over a validated range. End dates never consume inventory.
// Difference-array accumulation keeps work proportional to reservations + days.
export const calculateRentalAvailability = (
  totalQuantity: number,
  from: Date,
  to: Date,
  reservations: readonly Reservation[],
): AvailabilityDayDTO[] => {
  const start = utcDay(from);
  const dayCount = (utcDay(to) - start) / UTC_DAY_MS;
  const changes = new Array<number>(dayCount + 1).fill(0);
  for (const reservation of reservations) {
    if (!reservation.requestedFrom || !reservation.requestedTo) continue;
    const first = Math.max(0, (utcDay(reservation.requestedFrom) - start) / UTC_DAY_MS);
    const end = Math.min(dayCount, (utcDay(reservation.requestedTo) - start) / UTC_DAY_MS);
    if (first >= end) continue;
    changes[first] += reservation.quantity;
    changes[end] -= reservation.quantity;
  }
  let reservedQuantity = 0;
  return Array.from({ length: dayCount }, (_, index) => {
    reservedQuantity += changes[index];
    const availableQuantity = Math.max(0, totalQuantity - reservedQuantity);
    return {
      date: new Date(start + index * UTC_DAY_MS).toISOString().slice(0, 10),
      reservedQuantity,
      availableQuantity,
      status: reservedQuantity === 0 ? "AVAILABLE" : availableQuantity > 0 ? "PARTIAL" : "FULL",
    };
  });
};
