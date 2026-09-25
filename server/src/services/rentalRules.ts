import { AppError } from "../errors/AppError";

const calendarDate = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const validateRentalRequest = (
  product: { quantityAvailable: number; minRentalDays: number | null; maxRentalDays: number | null },
  request: { quantity?: number; requestedFrom?: Date; requestedTo?: Date },
) => {
  if (!request.requestedFrom || !request.requestedTo ||
      !Number.isFinite(request.requestedFrom.getTime()) || !Number.isFinite(request.requestedTo.getTime())) {
    throw new AppError("Rental orders require requestedFrom and requestedTo.", 400);
  }
  const requestedFrom = calendarDate(request.requestedFrom);
  const requestedTo = calendarDate(request.requestedTo);
  const days = (requestedTo.getTime() - requestedFrom.getTime()) / 86_400_000;
  if (days < 1) throw new AppError("Rental end date must be after the start date (UTC calendar days).", 400);
  if (product.minRentalDays !== null && days < product.minRentalDays) {
    throw new AppError(`Rental must be at least ${product.minRentalDays} days.`, 400);
  }
  if (product.maxRentalDays !== null && days > product.maxRentalDays) {
    throw new AppError(`Rental must be at most ${product.maxRentalDays} days.`, 400);
  }
  const quantity = request.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.quantityAvailable) {
    throw new AppError("Rental quantity exceeds available inventory or is invalid.", 400);
  }
  return { requestedFrom, requestedTo };
};

