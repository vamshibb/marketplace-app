import { api } from "../../../shared/api/axios";
import type { ApiResponse } from "../../../shared/types/api";
import type { Order, OrderAction, OrderRole } from "../types";

export const updateOrderStatus = async (id: string, action: OrderAction): Promise<Order> => {
  const response = await api.patch<ApiResponse<Order>>(`/orders/${encodeURIComponent(id)}/${action}`);
  return response.data.data;
};

export const getOrders = async (role: OrderRole, signal?: AbortSignal): Promise<Order[]> => {
  const response = await api.get<ApiResponse<Order[]>>(`/orders/${role}`, { signal });
  return response.data.data;
};
