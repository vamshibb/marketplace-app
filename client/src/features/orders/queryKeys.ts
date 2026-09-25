import type { OrderRole } from "./types";
export const ordersQueryKeys = {
  detail: (userId: string | undefined, id: string) => ["orders", userId, "detail", id] as const,
  action: (userId: string | undefined, id: string) => ["orders", userId, "action", id] as const,
  list: (userId: string | undefined, role: OrderRole) => ["orders", userId, role] as const,
};
