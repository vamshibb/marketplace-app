import { api } from "../../../shared/api/axios";
import type { ApiResponse } from "../../../shared/types/api";
import type { OrderRequestValues } from "../schemas/orderRequestSchema";

export type RentalDispute = {
  id: string;
  orderId: string;
  openedById: string;
  reason: string;
  details: string | null;
  status: "OPEN" | "RESOLVED" | "CANCELLED";
  resolution: "RELEASE_DEPOSIT" | "CAPTURE_DEPOSIT" | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const createOrder = async (productId: string, { quantity, notes, requestedFrom, requestedTo }: OrderRequestValues): Promise<Order> => {
  const response = await api.post<ApiResponse<Order>>(`/orders/products/${encodeURIComponent(productId)}`, {
    quantity, notes,
    ...(requestedFrom !== undefined ? { requestedFrom } : {}),
    ...(requestedTo !== undefined ? { requestedTo } : {}),
  });
  return response.data.data;
};
import type { Order, OrderAction, OrderRole } from "../types";

export const updateOrderStatus = async (id: string, action: OrderAction): Promise<Order> => {
  const response = await api.patch<ApiResponse<Order>>(`/orders/${encodeURIComponent(id)}/${action}`);
  return response.data.data;
};

export const getOrder = async (id: string, signal?: AbortSignal): Promise<Order> => {
  const response = await api.get<ApiResponse<Order>>(`/orders/${encodeURIComponent(id)}`, { signal });
  return response.data.data;
};

export const getOrders = async (role: OrderRole, signal?: AbortSignal): Promise<Order[]> => {
  const response = await api.get<ApiResponse<Order[]>>(`/orders/${role}`, { signal });
  return response.data.data;
};

export const authorizeOrderPayment = async (orderId: string): Promise<{
  id: string;
  orderId: string;
  purpose: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}> => {
  const response = await api.post<ApiResponse<{
    id: string;
    orderId: string;
    purpose: string;
    amount: string;
    currency: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>>(`/orders/${encodeURIComponent(orderId)}/payments/authorize`);
  return response.data.data;
};

export const openRentalDispute = async (
  orderId: string,
  reason: string,
  details?: string
): Promise<RentalDispute> => {
  const response = await api.post<ApiResponse<RentalDispute>>(
    `/orders/${encodeURIComponent(orderId)}/dispute`,
    {
      reason,
      ...(details?.trim() ? { details: details.trim() } : {}),
    }
  );

  return response.data.data;
};

export const getRentalDispute = async (
  orderId: string,
  signal?: AbortSignal
): Promise<RentalDispute> => {
  const response = await api.get<ApiResponse<RentalDispute>>(
    `/orders/${encodeURIComponent(orderId)}/dispute`,
    { signal }
  );

  return response.data.data;
};

export const cancelRentalDispute = async (
  orderId: string
): Promise<RentalDispute> => {
  const response = await api.patch<ApiResponse<RentalDispute>>(
    `/orders/${encodeURIComponent(orderId)}/dispute/cancel`
  );

  return response.data.data;
};