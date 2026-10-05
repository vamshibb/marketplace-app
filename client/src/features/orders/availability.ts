// Public availability surface shared with product owner management.
export { useRentalAvailability } from "./hooks/useRentalAvailability";
export { ordersQueryKeys as rentalAvailabilityQueryKeys } from "./queryKeys";
export type { AvailabilityDay } from "./availabilityTypes";
export { addDays, monthDays, monthStart, requiredAvailabilityMonths, shiftMonth, utcToday } from "./utils/rentalCalendarDates";
export { rentalDuration } from "./utils/rentalDuration";
