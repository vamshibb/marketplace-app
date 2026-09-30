import { useId, type ReactElement, type RefObject } from "react";
import { Star } from "lucide-react";
import type { ReputationSummary, UserReputationReview } from "../types";

interface ReputationSectionProps {
  role: "SELLER" | "BUYER";
  summary: ReputationSummary;
  reviews: UserReputationReview[];
  targetId: string | null;
  targetRef: RefObject<HTMLLIElement | null>;
}

export const ReputationSection = ({ role, summary, reviews, targetId, targetRef }: ReputationSectionProps): ReactElement => {
  const headingId = useId();
  const seller = role === "SELLER";
  return <section aria-labelledby={headingId} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 id={headingId} className="text-lg font-semibold text-slate-900">{seller ? "Seller / Owner Reputation" : "Buyer / Renter Reputation"}</h2>
    {summary.reviewCount === 0 ? <p className="text-sm text-slate-500">{seller ? "No seller/owner reviews yet." : "No buyer/renter reviews yet."}</p>
      : <>
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Star aria-hidden="true" className="size-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-slate-900">{summary.averageRating?.toFixed(1)} / 5</span>
          <span>{summary.reviewCount} {summary.reviewCount === 1 ? "review" : "reviews"}</span>
        </p>
        <ul className="divide-y divide-slate-100">
          {reviews.filter(review => review.role === role).map(review => <li key={review.id}
            ref={review.id === targetId ? targetRef : undefined} tabIndex={review.id === targetId ? -1 : undefined}
            className="scroll-mt-20 space-y-2 rounded-md py-3 data-[highlighted=true]:bg-blue-50 data-[highlighted=true]:ring-2 data-[highlighted=true]:ring-blue-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 text-sm font-medium wrap-anywhere text-slate-800">{review.reviewer.displayName ?? review.reviewer.email}</p>
              <time dateTime={review.createdAt} className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</time>
            </div>
            <span role="img" aria-label={`${review.rating} out of 5 stars`} className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(star => <Star key={star} aria-hidden="true" className={`size-4 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />)}
            </span>
            <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">{review.transactionType}</span>
              <span className="min-w-0 wrap-anywhere">{review.product.title}</span>
            </p>
            {review.comment && <p className="whitespace-pre-wrap text-sm wrap-anywhere text-slate-600">{review.comment}</p>}
          </li>)}
        </ul>
      </>}
  </section>;
};
