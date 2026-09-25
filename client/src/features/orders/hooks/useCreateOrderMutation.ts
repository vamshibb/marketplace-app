import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { authQueryKeys, getCurrentUser, useAuthStore } from "../../auth";
import { createOrder } from "../api/orderApi";
import { ordersQueryKeys } from "../queryKeys";
import type { OrderRequestValues } from "../schemas/orderRequestSchema";

export const useCreateOrderMutation = (productId: string, sellerId: string, onCreated: () => void) => {
  const client = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (values: OrderRequestValues) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error("Please sign in to request an order.");
      const user = await client.ensureQueryData({ queryKey: authQueryKeys.currentUser(), queryFn: getCurrentUser });
      if (user.id === sellerId) throw new Error("You cannot order your own listing.");
      if (useAuthStore.getState().token !== token) throw new Error("Your session changed. Please try again.");
      const order = await createOrder(productId, values);
      return { order, userId: user.id, token };
    },
    onSuccess: ({ userId, token }) => {
      if (useAuthStore.getState().token !== token) return;
      void client.invalidateQueries({ queryKey: ordersQueryKeys.list(userId, "buyer") });
      toast.success("Order request sent.");
      onCreated();
      navigate("/orders?tab=purchases");
    },
    onError: (error) => {
      const message: unknown = isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(typeof message === "string" ? message : error.message || "Unable to send order request.");
    },
  });
};

