import type { UserSummary } from "../auth";

export type OrderStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED" | "ACTIVE" | "RETURN_PENDING";
export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";
export type OrderRole = "buyer" | "seller";
export type OrderAction = "accept" | "reject" | "cancel" | "complete" | "start" | "return" | "confirm-return";
export interface Order {
  id: string;
  status: OrderStatus;
  transactionType: "SALE" | "RENT";
  quantity: number;
  unitPrice: string;
  product: { id: string; title: string };
  buyer: UserSummary;
  seller: UserSummary;
  paymentStatus: PaymentStatus | null;
  requestedFrom: string | null;
  requestedTo: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
