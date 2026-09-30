import { useId, type ReactElement } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import type { UserReputation } from "../types";

interface SellerReputationProps {
  reputation: UseQueryResult<UserReputation, Error>;
}

export const SellerReputationSummary = ({ reputation }: SellerReputationProps): ReactElement => {
  if (reputation.isPending) return <p role="status" className="text-xs text-slate-500">Loading seller reputation...</p>;
  if (reputation.isError) return <p className="text-xs text-slate-500">Seller reputation unavailable.</p>;
  const { averageRating, reviewCount } = reputation.data.seller;
  if (reviewCount === 0) return <p className="text-xs text-slate-500">No seller reviews yet.</p>;
  return <p className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
    <Star aria-hidden="true" className="size-3.5 fill-amber-400 text-amber-400" />
    <span aria-label={`${averageRating?.toFixed(1)} out of 5 stars`}>{averageRating?.toFixed(1)}</span>
    <span aria-hidden="true">&middot;</span>
    <span>{reviewCount} seller {reviewCount === 1 ? "review" : "reviews"}</span>
  </p>;
};

export const SellerReviews = ({ reputation }: SellerReputationProps): ReactElement => {
  const headingId = useId();
  const reviews = reputation.data?.reviews.filter(review => review.role === "SELLER") ?? [];
  return <section aria-labelledby={headingId} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 id={headingId} className="text-lg font-semibold text-slate-900">Seller Reputation</h2>
    <p className="text-sm text-slate-500">Reviews from people who bought or rented from this seller.</p>
    {reputation.isPending ? <p role="status" className="text-sm text-slate-500">Loading seller reviews...</p>
      : reputation.isError ? <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
        <p className="text-red-600">Unable to load seller reviews.</p>
        <Button size="sm" variant="secondary" disabled={reputation.isFetching} onClick={() => void reputation.refetch()}>Retry</Button>
      </div>
      : reputation.data.seller.reviewCount === 0 ? <p className="text-sm text-slate-500">No seller reviews yet.</p>
      : <ul className="divide-y divide-slate-100">
        {reviews.map(review => <li key={review.id} className="space-y-2 py-3 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 text-sm font-medium wrap-anywhere text-slate-800">{review.reviewer.displayName ?? review.reviewer.email}</p>
            <time dateTime={review.createdAt} className="text-xs text-slate-500">
              {new Date(review.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            </time>
          </div>
          <span role="img" aria-label={`${review.rating} out of 5 stars`} className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(star => <Star key={star} aria-hidden="true"
              className={`size-4 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />)}
          </span>
          <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">{review.transactionType}</span>
            <span className="min-w-0 wrap-anywhere">{review.product.title}</span>
          </p>
          {review.comment && <p className="whitespace-pre-wrap text-sm wrap-anywhere text-slate-600">{review.comment}</p>}
        </li>)}
      </ul>}
  </section>;
};
