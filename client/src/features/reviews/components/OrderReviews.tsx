import { useState, type ReactElement } from "react";
import { useAuthStore, useCurrentUserQuery } from "../../auth";
import { Button } from "../../../shared/ui/Button";
import { useReviewStatusQuery } from "../hooks/useReviewStatusQuery";
import { ReviewModal } from "./ReviewModal";
import type { ReviewTarget } from "../types";

interface OrderReviewsProps {
  orderId: string;
  role: "buyer" | "seller";
  completed: boolean;
}

const ReviewActions = ({ orderId, role, completed }: OrderReviewsProps): ReactElement | null => {
  const status = useReviewStatusQuery(orderId, completed);
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  if (!completed) return null;
  if (status.isPending) return <p role="status" className="border-t border-slate-100 pt-3 text-sm text-slate-500">Loading review status...</p>;
  if (status.isError) return <div role="alert" className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3 text-sm">
    <p className="text-red-600">Unable to load review status.</p>
    <Button size="sm" variant="secondary" disabled={status.isFetching} onClick={() => void status.refetch()}>Retry</Button>
  </div>;
  const { productReview, userReview } = status.data;
  const counterpart = role === "buyer" ? "Seller" : "Buyer";
  const selected = target === "product" ? productReview : userReview;
  const canReview = selected.eligible && !selected.submitted && (target !== "product" || role === "buyer");
  return <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
    <div role="status" className="flex flex-wrap gap-2 text-sm font-medium text-emerald-700">
      {role === "buyer" && productReview.submitted && <span>Product Reviewed &#10003;</span>}
      {userReview.submitted && <span>{counterpart} Reviewed &#10003;</span>}
    </div>
    {role === "buyer" && productReview.eligible && !productReview.submitted && <Button size="sm" variant="secondary" onClick={() => setTarget("product")}>Review Product</Button>}
    {userReview.eligible && !userReview.submitted && <Button size="sm" variant="secondary" onClick={() => setTarget(role === "buyer" ? "seller" : "buyer")}>Review {counterpart}</Button>}
    {target && canReview && <ReviewModal target={target} orderId={orderId} onClose={() => setTarget(null)} />}
  </div>;
};

export const OrderReviews = (props: OrderReviewsProps): ReactElement | null => {
  const token = useAuthStore(state => state.token);
  const { data: user } = useCurrentUserQuery();
  if (!token || !user || !props.completed) return null;
  return <ReviewActions key={`${user.id}:${props.orderId}:${props.role}`} {...props} />;
};
