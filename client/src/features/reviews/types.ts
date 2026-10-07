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
  // Present in user-review creation responses only.
  revieweeId?: string;
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

export interface ReputationSummary {
  averageRating: number | null;
  reviewCount: number;
}

export interface UserReputationReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: UserSummary;
  transactionType: "SALE" | "RENT";
  product: { id: string; title: string };
  role: "SELLER" | "BUYER";
}

export interface UserReputation {
  seller: ReputationSummary;
  buyer: ReputationSummary;
  reviews: UserReputationReview[];
}
