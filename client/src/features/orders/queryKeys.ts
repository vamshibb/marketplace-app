import type { OrderRole } from "./types";
export const ordersQueryKeys = {
  list: (userId: string | undefined, role: OrderRole) => ["orders", userId, role] as const,
};

