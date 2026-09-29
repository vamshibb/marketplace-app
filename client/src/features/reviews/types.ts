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
}
