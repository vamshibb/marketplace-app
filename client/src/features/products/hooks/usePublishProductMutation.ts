import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getProduct, uploadProductMedia } from "../api/productApi";
import { productsQueryKeys } from "../queryKeys";
import type { ProductFormValues } from "../schemas/productSchema";
import { useCreateProductMutation } from "./useCreateProductMutation";

export const usePublishProductMutation = () => {
  const createProduct = useCreateProductMutation();
  const queryClient = useQueryClient();
  const createdId = useRef<string | null>(null);
  const unverifiedUploadCount = useRef<number | null>(null);
  const [hasCreatedProduct, setHasCreatedProduct] = useState(false);
  const [canRetryUpload, setCanRetryUpload] = useState(false);

  const checkUpload = async (productId: string, expectedCount: number): Promise<boolean> => {
    const product = await getProduct(productId).catch(() => {
      throw new Error("Your listing was created, but its saved media could not be verified. No further upload will be attempted until verification succeeds.");
    });
    if (product.media.length === expectedCount) {
      return true;
    }
    if (product.media.length === 0) {
      unverifiedUploadCount.current = null;
      setCanRetryUpload(true);
      return false;
    }
    throw new Error("Your listing contains an unexpected number of media items. Upload retry is blocked to avoid duplicates. Review the listing before continuing.");
  };

  const mutation = useMutation({
    mutationFn: async ({ values, files }: { values: ProductFormValues; files: File[] }) => {
      setCanRetryUpload(false);
      if (!createdId.current) {
        const product = await createProduct.mutateAsync(values);
        createdId.current = product.id;
        setHasCreatedProduct(true);
      }
      // Recheck an uncertain previous upload before allowing another POST,
      // even if the selected files have since changed.
      if (unverifiedUploadCount.current !== null) {
        if (await checkUpload(createdId.current, unverifiedUploadCount.current)) {
          return createdId.current;
        }
      }
      if (files.length) {
        setCanRetryUpload(false);
        try {
          await uploadProductMedia(createdId.current, files);
        } catch (uploadError) {
          unverifiedUploadCount.current = files.length;
          if (!(await checkUpload(createdId.current, files.length))) {
            throw uploadError;
          }
        }
      }
      return createdId.current;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsQueryKeys.all() });
    },
  });
  return { ...mutation, hasCreatedProduct, canRetryUpload };
};
