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
  blocks: readonly { blockedFrom: Date; blockedTo: Date; quantity: number }[] = [],
): AvailabilityDayDTO[] => {
  const start = utcDay(from);
  const dayCount = (utcDay(to) - start) / UTC_DAY_MS;
  const changes = new Array<number>(dayCount + 1).fill(0);
  const blockedChanges = new Array<number>(dayCount + 1).fill(0);
  const accumulate = (from: Date | null, to: Date | null, quantity: number, target: number[]) => {
    if (!from || !to) return;
    const first = Math.max(0, (utcDay(from) - start) / UTC_DAY_MS);
    const end = Math.min(dayCount, (utcDay(to) - start) / UTC_DAY_MS);
    if (first >= end) return;
    target[first] += quantity;
    target[end] -= quantity;
  };
  for (const reservation of reservations) {
    accumulate(reservation.requestedFrom, reservation.requestedTo, reservation.quantity, changes);
  }
  for (const block of blocks) accumulate(block.blockedFrom, block.blockedTo, block.quantity, blockedChanges);
  let blockedQuantity = 0;
  let reservedQuantity = 0;
  return Array.from({ length: dayCount }, (_, index) => {
    reservedQuantity += changes[index];
    blockedQuantity += blockedChanges[index];
    const availableQuantity = Math.max(0, totalQuantity - reservedQuantity - blockedQuantity);
    return {
      date: new Date(start + index * UTC_DAY_MS).toISOString().slice(0, 10),
      reservedQuantity,
      blockedQuantity,
      availableQuantity,
      status: reservedQuantity + blockedQuantity === 0 ? "AVAILABLE" : availableQuantity > 0 ? "PARTIAL" : "FULL",
    };
  });
};
