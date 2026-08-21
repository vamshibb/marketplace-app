import {
  OrderStatus,
  Prisma,
} from "../generated/prisma";
import { prisma } from "../prisma/client";

export const orderSelect = {
  id: true,
  buyerId: true,
  sellerId: true,
  productId: true,
  productTitle: true,
  quantity: true,
  unitPrice: true,
  status: true,
  requestedFrom: true,
  requestedTo: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  buyer: {
    select: {
      id: true,
      email: true,
    },
  },
  seller: {
    select: {
      id: true,
      email: true,
    },
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

export const updateOrderStatus = (
  id: string,
  status: OrderStatus
) => {
  return prisma.order.update({
    where: { id },
    data: { status },
    select: orderSelect,
  });
};
