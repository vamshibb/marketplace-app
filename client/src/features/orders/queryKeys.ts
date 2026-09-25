import type { OrderRole } from "./types";
export const ordersQueryKeys = {
  action: (userId: string | undefined, id: string) => ["orders", userId, "action", id] as const,
  list: (userId: string | undefined, role: OrderRole) => ["orders", userId, role] as const,
};
