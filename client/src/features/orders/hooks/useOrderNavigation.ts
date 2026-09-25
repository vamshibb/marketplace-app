import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../../auth";
import { orderQueryOptions } from "./useOrderQuery";

export const useOrderNavigation = (userId: string) => {
  const client = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = useAuthStore.getState().token;
      try {
        const order = await client.fetchQuery(orderQueryOptions(userId, id));
        if (useAuthStore.getState().token !== token) return;
        const tab = order.buyer.id === userId ? "purchases" : order.seller.id === userId ? "sales" : null;
        if (!tab) throw new Error("Order is not accessible.");
        navigate(`/orders?${new URLSearchParams({ tab, orderId: order.id })}`);
      } catch {
        if (useAuthStore.getState().token !== token) return;
        toast.error("Unable to access this order.");
        navigate("/orders");
      }
    },
  });
};
