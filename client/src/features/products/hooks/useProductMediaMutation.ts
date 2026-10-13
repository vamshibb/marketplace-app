import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRef, useState } from "react";
import { deleteProductMedia, getProductMedia, reorderProductMedia, uploadProductMedia } from "../api/productApi";
import { productsQueryKeys } from "../queryKeys";
import { favoritesQueryKeys } from "../favoritesQueryKeys";
import type { ProductDetail, ProductMedia } from "../types";
import { updateProductMediaCache } from "./productMediaCache";

export type ProductMediaAction =
  | { type: "upload"; files: File[] }
  | { type: "replace"; mediaId: string; file: File; mediaIds: string[] }
  | { type: "remove"; mediaId: string }
  | { type: "reorder"; mediaIds: string[] }
  | { type: "refresh" };

export const useProductMediaMutation = (productId: string, disabled: boolean) => {
  const client = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recovery, setRecovery] = useState<false | "upload" | "replacement">(false);
  const [refreshed, setRefreshed] = useState(false);
  const replacement = useRef<{ originalId: string; uploadedId: string } | null>(null);
  // A failed response may still have committed. Verify before repeating any POST.
  const uncertainUpload = useRef<string[] | null>(null);
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
      if (action.type === "refresh") {
        const fresh = await getProductMedia(productId);
        setRefreshed(true);
        return fresh;
      }
      let current = [...(client.getQueryData<ProductDetail>(detailKey)?.media ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
      if (action.type === "upload" || action.type === "replace") {
        if (uncertainUpload.current) {
          const fresh = await getProductMedia(productId);
          updateProductMediaCache(client, productId, fresh);
          const previous = uncertainUpload.current;
          if (fresh.length !== previous.length || fresh.some(item => !previous.includes(item.id))) {
            throw new Error("The previous upload may have saved. Refresh media and review it before keeping the refreshed media or retrying.");
          }
          uncertainUpload.current = null;
          current = [...fresh].sort((a, b) => a.sortOrder - b.sortOrder);
        }
        if (action.type === "replace") {
          current = await getProductMedia(productId);
          updateProductMediaCache(client, productId, current);
          current.sort((a, b) => a.sortOrder - b.sortOrder);
        }
        if (!replacement.current) {
          const files = action.type === "upload" ? action.files : [action.file];
          if (current.length + files.length > 10) throw new Error(action.type === "replace"
            ? "A free media slot is required. Replacement cannot safely start with 10 saved items."
            : "The listing has no room for these files. Refresh media and review the 10-item limit.");
          if (action.type === "replace" && !current.some(item => item.id === action.mediaId)) throw new Error("The original media is no longer present. Refresh media.");
          uncertainUpload.current = current.map(item => item.id);
          setUploadProgress(null);
          setUploading(true);
          let uploaded: ProductMedia[];
          try {
            uploaded = await uploadProductMedia(productId, files, setUploadProgress);
          } finally {
            setUploading(false);
          }
          if (uploaded.length !== files.length) throw new Error("The upload response could not be verified. Refresh media before retrying.");
          uncertainUpload.current = null;
          current = [...current, ...uploaded];
          updateProductMediaCache(client, productId, current);
          if (action.type === "upload") { setRecovery(false); return current; }
          replacement.current = { originalId: action.mediaId, uploadedId: uploaded[0].id };
        }
        const pending = replacement.current!;
        if (!current.some(item => item.id === pending.uploadedId)) throw new Error("Replacement media is missing. Refresh media and review the listing; the original will not be deleted.");
        if (current.some(item => item.id === pending.originalId)) {
          // Stage the final order with the original last, so deleting it leaves
          // contiguous sortOrder values without a second reorder.
          const existingIds = current.filter(item => item.id !== pending.uploadedId).map(item => item.id);
          const preferredIds = action.type === "replace" ? action.mediaIds : existingIds;
          const ids = [...preferredIds.filter(id => existingIds.includes(id)), ...existingIds.filter(id => !preferredIds.includes(id))];
          ids.splice(ids.indexOf(pending.originalId), 1, pending.uploadedId);
          ids.push(pending.originalId);
          await reorderProductMedia(productId, ids);
          current = current.map(item => ({ ...item, sortOrder: ids.indexOf(item.id) }));
          updateProductMediaCache(client, productId, current);
          await deleteProductMedia(productId, pending.originalId);
          current = current.filter(item => item.id !== pending.originalId);
        }
        replacement.current = null;
        setRecovery(false);
        return current;
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
    onError: (_error, action) => {
      if (action.type === "upload" || action.type === "replace") setRecovery(replacement.current ? "replacement" : "upload");
    },
    onSettled: () => { starting.current = false; },
  });
  const forbidden = isAxiosError(mutation.error) && mutation.error.response?.status === 403;
  const serverMessage: unknown = isAxiosError(mutation.error) ? mutation.error.response?.data?.message : undefined;
  const errorMessage = !mutation.error ? undefined : forbidden
    ? "You no longer have permission to manage this listing's media."
    : `${({ upload: "Upload", replace: "Replacement", remove: "Delete", reorder: "Reorder", refresh: "Refresh" } as const)[mutation.variables?.type ?? "refresh"]} failed. ${
      typeof serverMessage === "string" && serverMessage.trim() ? serverMessage
        : mutation.error instanceof Error && !isAxiosError(mutation.error) ? mutation.error.message : "Please retry or refresh media."}`;
  const recoveryMessage = recovery && !mutation.isPending ? recovery === "replacement"
    ? "Replacement uploaded, but finishing failed. Retry resumes without uploading again, or refresh to review both items."
    : "Files are retained. Retry verifies saved media before uploading again, or refresh to review." : undefined;
  const run = (action: ProductMediaAction, onSuccess?: () => void): void => {
    if (disabled || forbidden || starting.current || client.isMutating({ mutationKey, exact: true })) return;
    if (recovery && action.type !== "refresh" && action.type !== "upload" && action.type !== "replace") return;
    setRefreshed(false);
    starting.current = true;
    mutation.mutate(action, { onSuccess });
  };
  return { run, isPending: mutation.isPending || pendingCount > 0, action: mutation.variables?.type,
    isSuccess: mutation.isSuccess, forbidden, errorMessage, uploadProgress, uploading, recovery: Boolean(recovery), recoveryMessage,
    canKeepRefreshed: recovery && refreshed,
    keepRefreshed: () => {
      if (mutation.isPending || !refreshed) return;
      replacement.current = null;
      uncertainUpload.current = null;
      setRecovery(false);
      mutation.reset();
    },
  };
};
