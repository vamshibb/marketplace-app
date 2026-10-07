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

interface Block { blockedFrom: Date; blockedTo: Date; quantity: number }

const capacityIntervals = (reservations: readonly Reservation[], blocks: readonly Block[]) => [
  ...reservations.map(item => ({ from: item.requestedFrom, to: item.requestedTo, quantity: item.quantity, blocked: false })),
  ...blocks.map(item => ({ from: item.blockedFrom, to: item.blockedTo, quantity: item.quantity, blocked: true })),
].flatMap(item => item.from && item.to && utcDay(item.from) < utcDay(item.to)
  ? [{ ...item, from: utcDay(item.from), to: utcDay(item.to) }] : []);

// Sweep the same UTC [start, end) intervals without allocating days across
// potentially years of commitments. Adjacent end/start events share a boundary.
export const peakRentalCapacity = (reservations: readonly Reservation[], blocks: readonly Block[]): number => {
  const changes = new Map<number, number>();
  for (const item of capacityIntervals(reservations, blocks)) {
    changes.set(item.from, (changes.get(item.from) ?? 0) + item.quantity);
    changes.set(item.to, (changes.get(item.to) ?? 0) - item.quantity);
  }
  let consumed = 0;
  let peak = 0;
  for (const [, change] of [...changes].sort(([a], [b]) => a - b)) {
    consumed += change;
    peak = Math.max(peak, consumed);
  }
  return peak;
};

// Pure calculation over a validated range. End dates never consume inventory.
// Difference-array accumulation keeps work proportional to reservations + days.
export const calculateRentalAvailability = (
  totalQuantity: number,
  from: Date,
  to: Date,
  reservations: readonly Reservation[],
  blocks: readonly Block[] = [],
): AvailabilityDayDTO[] => {
  const start = utcDay(from);
  const dayCount = (utcDay(to) - start) / UTC_DAY_MS;
  const changes = new Array<number>(dayCount + 1).fill(0);
  const blockedChanges = new Array<number>(dayCount + 1).fill(0);
  for (const item of capacityIntervals(reservations, blocks)) {
    const first = Math.max(0, (item.from - start) / UTC_DAY_MS);
    const end = Math.min(dayCount, (item.to - start) / UTC_DAY_MS);
    if (first >= end) continue;
    const target = item.blocked ? blockedChanges : changes;
    target[first] += item.quantity;
    target[end] -= item.quantity;
  }
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
