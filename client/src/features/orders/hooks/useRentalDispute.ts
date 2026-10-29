import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";

import {
  useAuthStore,
  useCurrentUserQuery,
} from "../../auth";
import {
  cancelRentalDispute,
  getRentalDispute,
  openRentalDispute,
  type RentalDispute,
} from "../api/orderApi";

const disputeQueryKey = (
  userId: string | undefined,
  orderId: string
) => ["orders", userId, "dispute", orderId] as const;

export const useRentalDisputeQuery = (
  orderId: string,
  enabled = true
) => {
  const { data: user } = useCurrentUserQuery();
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: disputeQueryKey(user?.id, orderId),

    queryFn: async (): Promise<RentalDispute | null> => {
      try {
        return await getRentalDispute(orderId);
      } catch (error) {
        if (
          isAxiosError(error) &&
          error.response?.status === 404
        ) {
          return null;
        }

        throw error;
      }
    },

    enabled: enabled && Boolean(user && token),
    retry: false,
  });
};

export const useOpenRentalDisputeMutation = (
  orderId: string
) => {
  const client = useQueryClient();
  const { data: user } = useCurrentUserQuery();

  return useMutation({
    mutationKey: [
      "orders",
      user?.id,
      "dispute",
      orderId,
      "open",
    ] as const,

    mutationFn: async ({
      reason,
      details,
    }: {
      reason: string;
      details?: string;
    }) => {
      const token = useAuthStore.getState().token;

      if (!token || !user) {
        throw new Error(
          "Please sign in to open a dispute."
        );
      }

      return openRentalDispute(
        orderId,
        reason,
        details
      );
    },

    onSuccess: (dispute) => {
      client.setQueryData(
        disputeQueryKey(user?.id, orderId),
        dispute
      );

      toast.success("Rental dispute opened.");
    },

    onError: (error) => {
      const message: unknown = isAxiosError(error)
        ? error.response?.data?.message
        : undefined;

      toast.error(
        typeof message === "string"
          ? message
          : error instanceof Error
            ? error.message
            : "Unable to open rental dispute."
      );
    },
  });
};

export const useCancelRentalDisputeMutation = (
  orderId: string
) => {
  const client = useQueryClient();
  const { data: user } = useCurrentUserQuery();

  return useMutation({
    mutationKey: [
      "orders",
      user?.id,
      "dispute",
      orderId,
      "cancel",
    ] as const,

    mutationFn: async () => {
      const token = useAuthStore.getState().token;

      if (!token || !user) {
        throw new Error(
          "Please sign in to cancel the dispute."
        );
      }

      return cancelRentalDispute(orderId);
    },

    onSuccess: (dispute) => {
      client.setQueryData(
        disputeQueryKey(user?.id, orderId),
        dispute
      );

      toast.success("Rental dispute cancelled.");
    },

    onError: (error) => {
      const message: unknown = isAxiosError(error)
        ? error.response?.data?.message
        : undefined;

      toast.error(
        typeof message === "string"
          ? message
          : error instanceof Error
            ? error.message
            : "Unable to cancel rental dispute."
      );
    },
  });
};