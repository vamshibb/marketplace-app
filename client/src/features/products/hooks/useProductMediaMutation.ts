import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRef } from "react";
import { deleteProductMedia, getProductMedia, reorderProductMedia, uploadProductMedia } from "../api/productApi";
import { productsQueryKeys } from "../queryKeys";
import { favoritesQueryKeys } from "../favoritesQueryKeys";
import type { ProductDetail, ProductMedia } from "../types";
import { updateProductMediaCache } from "./productMediaCache";

export type ProductMediaAction =
  | { type: "upload"; files: File[] }
  | { type: "remove"; mediaId: string }
  | { type: "reorder"; mediaIds: string[] }
  | { type: "refresh" };

export const useProductMediaMutation = (productId: string, disabled: boolean) => {
  const client = useQueryClient();
  const mutationKey = productsQueryKeys.mediaMutation(productId);
  const pendingCount = useIsMutating({ mutationKey, exact: true });
  const starting = useRef(false);
  const detailKey = productsQueryKeys.detail(productId);
  const mutation = useMutation({
    mutationKey,
    retry: false,
    onMutate: async () => {
      await Promise.all([
        client.cancelQueries({ queryKey: detailKey, exact: true }),
        client.cancelQueries({ queryKey: productsQueryKeys.lists() }),
        client.cancelQueries({ queryKey: productsQueryKeys.mineRoot() }),
        client.cancelQueries({ queryKey: favoritesQueryKeys.lists() }),
      ]);
    },
    mutationFn: async (action: ProductMediaAction): Promise<ProductMedia[]> => {
      if (action.type === "refresh") return getProductMedia(productId);
      const current = client.getQueryData<ProductDetail>(detailKey)?.media ?? [];
      if (action.type === "upload") {
        const uploaded = await uploadProductMedia(productId, action.files);
        return [...current.filter(item => !uploaded.some(added => added.id === item.id)), ...uploaded];
      }
      if (action.type === "remove") {
        await deleteProductMedia(productId, action.mediaId);
        return current.filter(item => item.id !== action.mediaId);
      }
      await reorderProductMedia(productId, action.mediaIds);
      return current.map(item => ({ ...item, sortOrder: action.mediaIds.indexOf(item.id) }));
    },
    onSuccess: async media => {
      await client.cancelQueries({ queryKey: detailKey, exact: true });
      updateProductMediaCache(client, productId, media);
      await Promise.all([
        client.invalidateQueries({ queryKey: productsQueryKeys.lists() }),
        client.invalidateQueries({ queryKey: productsQueryKeys.mineRoot() }),
        client.invalidateQueries({ queryKey: favoritesQueryKeys.lists() }),
        // Mark stale for the next visit without replacing the active form's fields.
        client.invalidateQueries({ queryKey: detailKey, exact: true, refetchType: "none" }),
      ]);
    },
    onSettled: () => { starting.current = false; },
  });
  const forbidden = isAxiosError(mutation.error) && mutation.error.response?.status === 403;
  const serverMessage: unknown = isAxiosError(mutation.error) ? mutation.error.response?.data?.message : undefined;
  const errorMessage = !mutation.error ? undefined : forbidden
    ? "You no longer have permission to manage this listing's media."
    : typeof serverMessage === "string" && serverMessage.trim() ? serverMessage : "Unable to complete the media action. Please try again.";
  const run = (action: ProductMediaAction, onSuccess?: () => void): void => {
    if (disabled || forbidden || starting.current || client.isMutating({ mutationKey, exact: true })) return;
    starting.current = true;
    mutation.mutate(action, { onSuccess });
  };
  return { run, isPending: mutation.isPending || pendingCount > 0, action: mutation.variables?.type,
    isSuccess: mutation.isSuccess, forbidden, errorMessage };
};
