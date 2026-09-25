import { api } from "../../../shared/api/axios";
import type { ApiResponse } from "../../../shared/types/api";
import type { Order, OrderRole } from "../types";

export const getOrders = async (role: OrderRole, signal?: AbortSignal): Promise<Order[]> => {
  const response = await api.get<ApiResponse<Order[]>>(`/orders/${role}`, { signal });
  return response.data.data;
};

