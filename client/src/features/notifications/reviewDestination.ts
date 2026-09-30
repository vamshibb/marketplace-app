import type { Notification } from "./types";

export const getReviewDestination = (notification: Notification): string | null => {
  if (notification.type !== "REVIEW") return null;
  const metadata = notification.metadata;
  if (metadata?.reviewType === "PRODUCT" && typeof metadata.productId === "string" && metadata.productId.trim()) {
    return `/products/${encodeURIComponent(metadata.productId)}#reviews`;
  }
  if (metadata?.reviewType === "USER" && typeof metadata.reviewId === "string" && metadata.reviewId.trim()) {
    return `/reputation?reviewId=${encodeURIComponent(metadata.reviewId)}`;
  }
  return null;
};
