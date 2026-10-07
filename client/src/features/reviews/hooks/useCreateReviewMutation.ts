import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useAuthStore, useCurrentUserQuery } from "../../auth";
import { createReview } from "../api/reviewApi";
import { reviewQueryKeys } from "../queryKeys";
import type { ReviewValues } from "../schemas/reviewSchema";
import type { OrderReviewStatus, ReviewKind } from "../types";

export const useCreateReviewMutation = (orderId: string, kind: ReviewKind, onClose: () => void) => {
  const client = useQueryClient();
  const { data: user } = useCurrentUserQuery();
  const mutationKey = reviewQueryKeys.create(user?.id, orderId);
  const pendingCount = useIsMutating({ mutationKey, exact: true });
  const mutation = useMutation({
    mutationKey,
    mutationFn: async (values: ReviewValues) => {
      const token = useAuthStore.getState().token;
      if (!token || !user) throw new Error("Please sign in to submit a review.");
      const review = await createReview(orderId, kind, values);
      return { review, userId: user.id, token };
    },
    onSuccess: async ({ review, userId, token }) => {
      if (kind === "product" && review.productId) {
        void client.invalidateQueries({ queryKey: reviewQueryKeys.product(review.productId), exact: true });
      }
      if (kind === "user" && review.revieweeId) {
        void client.invalidateQueries({ queryKey: reviewQueryKeys.user(review.revieweeId), exact: true, refetchType: "all" });
      }
      if (useAuthStore.getState().token !== token) return;
      const queryKey = reviewQueryKeys.status(userId, orderId);
      await client.cancelQueries({ queryKey, exact: true });
      if (useAuthStore.getState().token !== token) return;
      const field = kind === "product" ? "productReview" : "userReview";
      client.setQueryData<OrderReviewStatus>(queryKey, current => current ? {
        ...current, [field]: { ...current[field], submitted: true, reviewId: review.id },
      } : current);
      onClose();
      toast.success("Review submitted successfully.");
      void client.invalidateQueries({ queryKey, exact: true });
    },
    onError: error => {
      const message: unknown = isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(typeof message === "string" ? message : error.message || "Unable to submit review.");
      if (user && isAxiosError(error) && error.response?.status === 409) {
        onClose();
        void client.invalidateQueries({ queryKey: reviewQueryKeys.status(user.id, orderId), exact: true });
      }
    },
  });
  return { ...mutation, isPending: mutation.isPending || pendingCount > 0 };
};
