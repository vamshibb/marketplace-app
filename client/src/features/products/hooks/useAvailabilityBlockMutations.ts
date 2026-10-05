import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { rentalAvailabilityQueryKeys } from "../../orders/availability";
import { createAvailabilityBlock, deleteAvailabilityBlock } from "../api/availabilityBlocksApi";
import { productsQueryKeys } from "../queryKeys";
import type { AvailabilityBlock, CreateAvailabilityBlock } from "../availabilityBlockTypes";

export const availabilityChangedMessage = "Availability changed. Review the refreshed calendar and choose another range or quantity.";
export const isAvailabilityForbidden = (error: unknown): boolean => isAxiosError(error) && error.response?.status === 403;
export const blockMutationError = (error: unknown): string => {
  if (isAvailabilityForbidden(error)) return "You cannot manage this listing";
  if (isAxiosError(error) && error.response?.status === 409) return availabilityChangedMessage;
  const message: unknown = isAxiosError(error) ? error.response?.data?.message : undefined;
  return typeof message === "string" ? message : "Unable to update availability. Please try again.";
};

export const availabilityBlockMutationOptions = (client: QueryClient, productId: string, userId: string, onCreated: () => void) => {
  const blocksKey = productsQueryKeys.availabilityBlocks(userId, productId);
  const refreshCalendar = () => client.invalidateQueries({ queryKey: rentalAvailabilityQueryKeys.availabilityRoot(productId) });
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: blocksKey }), refreshCalendar()]);
  const onError = async (error: Error) => {
    toast.error(blockMutationError(error));
    if (isAxiosError(error) && error.response?.status === 409) await refreshCalendar();
  };
  return {
    create: {
      mutationFn: (input: CreateAvailabilityBlock) => createAvailabilityBlock(productId, input),
      retry: false as const,
      onSuccess: async (block: AvailabilityBlock) => {
        client.setQueryData<AvailabilityBlock[]>(blocksKey, previous => previous && [...previous, block]);
        onCreated();
        toast.success("Availability blocked.");
        await refresh();
      },
      onError,
    },
    remove: {
      mutationFn: (blockId: string) => deleteAvailabilityBlock(productId, blockId),
      retry: false as const,
      onSuccess: async (_data: void, blockId: string) => {
        client.setQueryData<AvailabilityBlock[]>(blocksKey, previous => previous?.filter(block => block.id !== blockId));
        toast.success("Availability block removed.");
        await refresh();
      },
      onError,
    },
  };
};

export const useAvailabilityBlockMutations = (productId: string, userId: string, onCreated: () => void) => {
  const client = useQueryClient();
  const options = availabilityBlockMutationOptions(client, productId, userId, onCreated);
  return { create: useMutation(options.create), remove: useMutation(options.remove) };
};
