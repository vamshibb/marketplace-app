import { OrderStatus, Prisma } from "../generated/prisma";
import { prisma } from "../prisma/client";

export const findOverlappingRentalReservations = (productId: string, from: Date, to: Date, db: Prisma.TransactionClient = prisma) => db.order.findMany({
  where: {
    productId,
    transactionType: "RENT",
    status: { in: [OrderStatus.ACCEPTED, OrderStatus.ACTIVE, OrderStatus.RETURN_PENDING] },
    requestedFrom: { lt: to },
    requestedTo: { gt: from },
  },
  select: { requestedFrom: true, requestedTo: true, quantity: true },
});

export const findOverlappingAvailabilityBlocks = (productId: string, from: Date, to: Date, db: Prisma.TransactionClient = prisma) => db.availabilityBlock.findMany({
  where: { productId, blockedFrom: { lt: to }, blockedTo: { gt: from } },
  select: { blockedFrom: true, blockedTo: true, quantity: true },
});
