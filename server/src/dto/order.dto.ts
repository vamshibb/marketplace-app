import { OrderStatus } from "../generated/prisma";

interface OrderUserSummary {
  id: string;
  email: string;
}

interface OrderProductSummary {
  id: string;
  title: string;
}

interface OrderSource {
  id: string;
  status: OrderStatus;
  quantity: number;
  unitPrice: {
    toString(): string;
  };
  product: OrderProductSummary;
  buyer: OrderUserSummary;
  seller: OrderUserSummary;
  requestedFrom: Date | null;
  requestedTo: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderDTO {
  id: string;
  status: OrderStatus;
  quantity: number;
  unitPrice: string;
  product: OrderProductSummary;
  buyer: OrderUserSummary;
  seller: OrderUserSummary;
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
