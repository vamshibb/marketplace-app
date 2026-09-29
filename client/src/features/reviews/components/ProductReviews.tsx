import { useId, type ReactElement } from "react";
import { Star } from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import { useProductReviewsQuery } from "../hooks/useProductReviewsQuery";

export const ProductReviews = ({ productId }: { productId: string }): ReactElement => {
  const headingId = useId();
  const reviews = useProductReviewsQuery(productId);
  const items = reviews.data ?? [];
  const average = items.length ? (items.reduce((sum, review) => sum + review.rating, 0) / items.length).toFixed(1) : null;

  return <section aria-labelledby={headingId} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 id={headingId} className="text-lg font-semibold text-slate-900">Reviews</h2>
    {reviews.isPending ? <p role="status" className="text-sm text-slate-500">Loading reviews...</p>
      : reviews.isError ? <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
        <p className="text-red-600">Unable to load reviews.</p>
        <Button size="sm" variant="secondary" disabled={reviews.isFetching} onClick={() => void reviews.refetch()}>Retry</Button>
      </div>
      : items.length === 0 ? <p className="text-sm text-slate-500">No reviews yet.</p>
      : <>
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Star aria-hidden="true" className="size-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-slate-900">{average} / 5</span>
          <span>{items.length} {items.length === 1 ? "review" : "reviews"}</span>
        </p>
        <ul className="divide-y divide-slate-100">
          {items.map(review => <li key={review.id} className="space-y-2 py-3 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 text-sm font-medium wrap-anywhere text-slate-800">{review.user.displayName ?? review.user.email}</p>
              <time dateTime={review.createdAt} className="text-xs text-slate-500">
                {new Date(review.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </time>
            </div>
            <span role="img" aria-label={`${review.rating} out of 5 stars`} className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(star => <Star key={star} aria-hidden="true"
                className={`size-4 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />)}
            </span>
            {review.comment && <p className="whitespace-pre-wrap text-sm wrap-anywhere text-slate-600">{review.comment}</p>}
          </li>)}
        </ul>
      </>}
  </section>;
};
