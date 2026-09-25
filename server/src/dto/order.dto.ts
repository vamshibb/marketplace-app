import type { UserSummary } from "./user.dto";

import { OrderStatus, ListingType } from "../generated/prisma";

interface OrderProductSummary {
  id: string;
  title: string;
}

interface OrderSource {
  id: string;
  status: OrderStatus;
  transactionType: ListingType;
  quantity: number;
  unitPrice: {
    toString(): string;
  };
  product: OrderProductSummary;
  buyer: UserSummary;
  seller: UserSummary;
  requestedFrom: Date | null;
  requestedTo: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderDTO {
  id: string;
  status: OrderStatus;
  transactionType: ListingType;
  quantity: number;
  unitPrice: string;
  product: OrderProductSummary;
  buyer: UserSummary;
  seller: UserSummary;
  requestedFrom: Date | null;
  requestedTo: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const toOrderDTO = (
  order: OrderSource
): OrderDTO => {
  return {
    id: order.id,
    status: order.status,
    transactionType: order.transactionType,
    quantity: order.quantity,
    unitPrice: order.unitPrice.toString(),
    product: order.product,
    buyer: order.buyer,
    seller: order.seller,
    requestedFrom: order.requestedFrom,
    requestedTo: order.requestedTo,
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};
