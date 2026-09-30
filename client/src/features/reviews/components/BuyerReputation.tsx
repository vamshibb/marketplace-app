import { type ReactElement } from "react";
import { Star } from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import { useUserReputationQuery } from "../hooks/useUserReputationQuery";

const BuyerReputationContent = ({ buyerId }: { buyerId: string }): ReactElement => {
  const reputation = useUserReputationQuery(buyerId);
  if (reputation.isPending) return <p role="status" className="text-sm text-slate-500">Loading buyer/renter reputation...</p>;
  if (reputation.isError) return <div role="alert" className="space-y-2 text-sm">
    <p className="text-red-600">Unable to load buyer/renter reputation.</p>
    <Button size="sm" variant="secondary" disabled={reputation.isFetching} onClick={() => void reputation.refetch()}>Retry</Button>
  </div>;
  const { averageRating, reviewCount } = reputation.data.buyer;
  if (reviewCount === 0) return <p className="text-sm text-slate-500">No buyer/renter reviews yet.</p>;
  const reviews = reputation.data.reviews.filter(review => review.role === "BUYER");
  return <div className="space-y-2">
    <p className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
      <Star aria-hidden="true" className="size-3.5 fill-amber-400 text-amber-400" />
      <span aria-label={`${averageRating?.toFixed(1)} out of 5 stars`}>{averageRating?.toFixed(1)}</span>
      <span aria-hidden="true">&middot;</span>
      <span>{reviewCount} buyer/renter {reviewCount === 1 ? "review" : "reviews"}</span>
    </p>
    <ul className="divide-y divide-slate-100">
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
    </ul>
  </div>;
};

interface BuyerReputationProps {
  buyerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BuyerReputation = ({ buyerId, open, onOpenChange }: BuyerReputationProps): ReactElement => {
  return <details open={open} className="pt-1">
    <summary onClick={event => { event.preventDefault(); onOpenChange(!open); }} className="cursor-pointer rounded text-sm font-medium text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600">Buyer/Renter Reputation</summary>
    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
      {open && <BuyerReputationContent buyerId={buyerId} />}
    </div>
  </details>;
};
