import { useRef, type ReactElement } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAuthStore, useCurrentUserQuery } from "../../auth";
import { Button } from "../../../shared/ui/Button";
import { useScrollToTarget } from "../../../shared/hooks/useScrollToTarget";
import { useUserReputationQuery } from "../hooks/useUserReputationQuery";
import { ReputationSection } from "../components/ReputationSection";

export const MyReputationPage = (): ReactElement => {
  const token = useAuthStore(state => state.token);
  const user = useCurrentUserQuery();
  const reputation = useUserReputationQuery(user.data?.id, Boolean(token && user.data));
  const [params] = useSearchParams();
  const location = useLocation();
  const targetId = params.get("reviewId");
  const targetRef = useRef<HTMLLIElement>(null);
  const targetExists = reputation.isSuccess && reputation.data.reviews.some(review => review.id === targetId);
  useScrollToTarget(targetRef, token && targetId ? `${user.data?.id}:${location.key}:${targetId}` : null, targetExists, true);
  return <section className="w-full min-w-0 space-y-4">
    <header>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Reputation</h1>
      <p className="mt-1 text-sm text-slate-500">See feedback from people you've bought, sold, rented from, or rented to.</p>
    </header>
    {!token ? <p role="alert">Please sign in to view your reputation.</p>
      : user.isError || reputation.isError ? <div role="alert" className="space-y-2 text-sm">
        <p className="text-red-600">Unable to load your reputation.</p>
        <Button size="sm" variant="secondary" disabled={user.isFetching || reputation.isFetching}
          onClick={() => { if (user.isError) void user.refetch(); else void reputation.refetch(); }}>Retry</Button>
      </div>
      : !user.data || reputation.isPending ? <p role="status" className="text-sm text-slate-500">Loading reputation...</p>
      : <>
        <ReputationSection role="SELLER" summary={reputation.data.seller} reviews={reputation.data.reviews} targetId={targetId} targetRef={targetRef} />
        <ReputationSection role="BUYER" summary={reputation.data.buyer} reviews={reputation.data.reviews} targetId={targetId} targetRef={targetRef} />
      </>}
  </section>;
};
