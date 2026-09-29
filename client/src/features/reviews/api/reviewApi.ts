import { api } from "../../../shared/api/axios";
import type { ApiResponse } from "../../../shared/types/api";
import type { ReviewValues } from "../schemas/reviewSchema";
import type { CreatedReview, OrderReviewStatus, ReviewKind } from "../types";

export const getReviewStatus = async (orderId: string, signal?: AbortSignal): Promise<OrderReviewStatus> => {
  const response = await api.get<ApiResponse<OrderReviewStatus>>(
    `/orders/${encodeURIComponent(orderId)}/reviews/status`, { signal },
  );
  return response.data.data;
};

export const createReview = async (
  orderId: string, kind: ReviewKind, { rating, comment }: ReviewValues,
): Promise<CreatedReview> => {
  const response = await api.post<ApiResponse<CreatedReview>>(
    `/orders/${encodeURIComponent(orderId)}/reviews/${kind}`, { rating, comment },
  );
  return response.data.data;
};
