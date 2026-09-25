import { userSummarySelect } from "./user.select";
import {
  OrderStatus,
  Prisma,
} from "../generated/prisma";
import { prisma } from "../prisma/client";

// All reservation reads and the conditional acceptance share a serializable snapshot.
// Predicate conflicts between overlapping accepts cause P2034 and a fresh retry.
export const acceptRentalOrder = async (id: string, sellerId: string) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id }, select: orderSelect,
        });
        if (!order || order.sellerId !== sellerId || order.status !== OrderStatus.PENDING ||
            order.transactionType !== "RENT" || !order.requestedFrom || !order.requestedTo) {
          return { kind: "conflict" as const };
        }
        const product = await tx.product.findUniqueOrThrow({
          where: { id: order.productId }, select: { quantityAvailable: true },
        });
        const reserved = await tx.order.aggregate({
          where: {
            productId: order.productId,
            transactionType: "RENT",
            status: { in: [OrderStatus.ACCEPTED, OrderStatus.ACTIVE, OrderStatus.RETURN_PENDING] },
            requestedFrom: { lt: order.requestedTo },
            requestedTo: { gt: order.requestedFrom },
          },
          _sum: { quantity: true },
        });
        if ((reserved._sum.quantity ?? 0) + order.quantity > product.quantityAvailable) {
          return { kind: "unavailable" as const };
        }
        const updated = await tx.order.update({
          where: { id, sellerId, status: OrderStatus.PENDING, transactionType: "RENT" },
          data: { status: OrderStatus.ACCEPTED },
          select: orderSelect,
        });
        return { kind: "accepted" as const, order: updated };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2034" && attempt < 2) continue;
        if (error.code === "P2034" || error.code === "P2025") return { kind: "conflict" as const };
      }
      throw error;
    }
  }
};


export const orderSelect = {
  id: true,
  buyerId: true,
  sellerId: true,
  productId: true,
  productTitle: true,
  quantity: true,
  unitPrice: true,
  status: true,
  transactionType: true,
  requestedFrom: true,
  requestedTo: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  buyer: {
    select: userSummarySelect,
  },
  seller: {
    select: userSummarySelect,
  },
  product: {
    select: {
      id: true,
      title: true,
    },
  },
} satisfies Prisma.OrderSelect;

export const findOrderById = (
  id: string
) => {
  return prisma.order.findUnique({
    where: { id },
    select: orderSelect,
  });
};

export const findActiveOrderByBuyerAndProduct = (
  buyerId: string,
  productId: string
) => {
  return prisma.order.findFirst({
    where: {
      buyerId,
      productId,
      transactionType: "SALE",
      status: {
        in: [
          OrderStatus.PENDING,
          OrderStatus.ACCEPTED,
        ],
      },
    },
    select: orderSelect,
  });
};

export const findOrdersByBuyer = (
  buyerId: string,
  take = 20
) => {
  return prisma.order.findMany({
    where: { buyerId },
    select: orderSelect,
    orderBy: {
      createdAt: "desc",
    },
    take,
  });
};

export const findOrdersBySeller = (
  sellerId: string,
  take = 20
) => {
  return prisma.order.findMany({
    where: { sellerId },
    select: orderSelect,
    orderBy: {
      createdAt: "desc",
    },
    take,
  });
};

export const createOrder = (
  data: Prisma.OrderUncheckedCreateInput
) => {
  return prisma.order.create({
    data,
    select: orderSelect,
  });
};

// The status and actor predicates are part of the UPDATE, not just a prior read.
export const updateOrderStatus = async (
  id: string,
  status: OrderStatus,
  expectedStatus: OrderStatus,
  actor: { buyerId: string } | { sellerId: string },
) => {
  try {
    return await prisma.order.update({
      where: { id, status: expectedStatus, ...actor },
      data: { status },
      select: orderSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  }
};
