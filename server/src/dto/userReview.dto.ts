import type { ListingType } from "../generated/prisma";
import { toUserSummary, type UserSummary } from "./user.dto";

export type RevieweeRole = "SELLER" | "BUYER";

interface UserReviewSource {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  reviewer: UserSummary;
  order: {
    transactionType: ListingType;
    product: { id: string; title: string };
  };
}

export interface ReceivedUserReviewDTO {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  reviewer: UserSummary;
  transactionType: ListingType;
  product: { id: string; title: string };
  role: RevieweeRole;
}

export interface UserReviewSummaryDTO {
  averageRating: number | null;
  reviewCount: number;
}

export interface UserReputationDTO {
  seller: UserReviewSummaryDTO;
  buyer: UserReviewSummaryDTO;
  reviews: ReceivedUserReviewDTO[];
}

export const toReceivedUserReviewDTO = (review: UserReviewSource, role: RevieweeRole): ReceivedUserReviewDTO => ({
  id: review.id,
  rating: review.rating,
  comment: review.comment,
  createdAt: review.createdAt,
  reviewer: toUserSummary(review.reviewer),
  transactionType: review.order.transactionType,
  product: { id: review.order.product.id, title: review.order.product.title },
  role,
});
