import type { UserSummary } from "../auth";

export type ReviewTarget = "product" | "seller" | "buyer";
export type ReviewKind = "product" | "user";

export interface ReviewState {
  eligible: boolean;
  submitted: boolean;
  reviewId: string | null;
}

export interface OrderReviewStatus {
  productReview: ReviewState;
  userReview: ReviewState;
}

export interface CreatedReview {
  id: string;
  // Present in product-review creation responses only.
  productId?: string;
}

export interface ProductReview {
  id: string;
  orderId: string | null;
  productId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  user: UserSummary;
}
