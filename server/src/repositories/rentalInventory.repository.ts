import { OrderStatus, Prisma } from "../generated/prisma";
import { prisma } from "../prisma/client";

export const findRentalReservations = (productId: string, db: Prisma.TransactionClient = prisma, range?: { from: Date; to: Date }) => db.order.findMany({
  where: {
    productId,
    transactionType: "RENT",
    status: { in: [OrderStatus.ACCEPTED, OrderStatus.ACTIVE, OrderStatus.RETURN_PENDING] },
    ...(range ? { requestedFrom: { lt: range.to }, requestedTo: { gt: range.from } } : {}),
  },
  select: { requestedFrom: true, requestedTo: true, quantity: true },
});

export const findAvailabilityBlocks = (productId: string, db: Prisma.TransactionClient = prisma, range?: { from: Date; to: Date }) => db.availabilityBlock.findMany({
  where: { productId, ...(range ? { blockedFrom: { lt: range.to }, blockedTo: { gt: range.from } } : {}) },
  select: { blockedFrom: true, blockedTo: true, quantity: true },
});

export const findOverlappingRentalReservations = (productId: string, from: Date, to: Date, db: Prisma.TransactionClient = prisma) =>
  findRentalReservations(productId, db, { from, to });

export const findOverlappingAvailabilityBlocks = (productId: string, from: Date, to: Date, db: Prisma.TransactionClient = prisma) =>
  findAvailabilityBlocks(productId, db, { from, to });
