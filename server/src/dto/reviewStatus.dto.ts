interface ReviewStatus {
  eligible: boolean;
  submitted: boolean;
  reviewId: string | null;
}

export interface OrderReviewStatusDTO {
  productReview: ReviewStatus;
  userReview: ReviewStatus;
}
