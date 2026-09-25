import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useAuthStore, useCurrentUserQuery } from "../../auth";
import { updateOrderStatus } from "../api/orderApi";
import { ordersQueryKeys } from "../queryKeys";
import type { Order, OrderAction } from "../types";

const successMessages: Record<OrderAction, string> = {
  accept: "Order accepted.", reject: "Order rejected.",
  cancel: "Order cancelled.", complete: "Order completed.",
  start: "Rental started.", return: "Rental marked returned.",
  "confirm-return": "Return confirmed.",
};

export const useOrderActionMutation = (orderId: string) => {
  const client = useQueryClient();
  const { data: user } = useCurrentUserQuery();
  const key = ordersQueryKeys.action(user?.id, orderId);
  const pendingCount = useIsMutating({ mutationKey: key, exact: true });
  const mutation = useMutation({
    mutationKey: key,
    mutationFn: async (action: OrderAction) => {
      const token = useAuthStore.getState().token;
      if (!token || !user) throw new Error("Please sign in to manage orders.");
      const order = await updateOrderStatus(orderId, action);
      return { order, userId: user.id, token };
    },
    onSuccess: async ({ order, userId, token }, action) => {
      if (useAuthStore.getState().token !== token) return;
      const keys = [ordersQueryKeys.list(userId, "buyer"), ordersQueryKeys.list(userId, "seller")];
      await Promise.all(keys.map(queryKey => client.cancelQueries({ queryKey, exact: true })));
      if (useAuthStore.getState().token !== token) return;
      for (const queryKey of keys) {
        client.setQueryData<Order[]>(queryKey, current =>
          current?.map(item => item.id === order.id ? order : item));
      }
      toast.success(successMessages[action]);
    },
    onError: (error) => {
      const message: unknown = isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(typeof message === "string" ? message : error.message || "Unable to update order.");
      if (user && isAxiosError(error) && error.response?.status === 409) {
        void client.invalidateQueries({ queryKey: ordersQueryKeys.list(user.id, "buyer") });
        void client.invalidateQueries({ queryKey: ordersQueryKeys.list(user.id, "seller") });
      }
    },
  });
  return { ...mutation, isPending: mutation.isPending || pendingCount > 0 };
};
