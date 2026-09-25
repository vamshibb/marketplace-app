import type { UserSummary } from "../auth";

export type OrderStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED";
export type OrderRole = "buyer" | "seller";
export type OrderAction = "accept" | "reject" | "cancel" | "complete";
export interface Order {
  id: string;
  status: OrderStatus;
  quantity: number;
  unitPrice: string;
  product: { id: string; title: string };
  buyer: UserSummary;
  seller: UserSummary;
  requestedFrom: string | null;
  requestedTo: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

