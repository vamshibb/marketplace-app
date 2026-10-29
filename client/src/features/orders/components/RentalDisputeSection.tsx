import { useState } from "react";
import { useCurrentUserQuery } from "../../auth";
import { Button } from "../../../shared/ui/Button";
import {
  useCancelRentalDisputeMutation,
  useOpenRentalDisputeMutation,
  useRentalDisputeQuery,
} from "../hooks/useRentalDispute";
import type { Order } from "../types";

export const RentalDisputeSection = ({
  order,
}: {
  order: Order;
}) => {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  const { data: user } = useCurrentUserQuery();

  const disputeQuery = useRentalDisputeQuery(
    order.id,
    order.transactionType === "RENT" &&
      order.status === "RETURN_PENDING"
  );

  const openDispute =
    useOpenRentalDisputeMutation(order.id);

  const cancelDispute =
    useCancelRentalDisputeMutation(order.id);

  if (
    order.transactionType !== "RENT" ||
    order.status !== "RETURN_PENDING"
  ) {
    return null;
  }

  if (disputeQuery.isLoading) {
    return (
      <div className="border-t border-slate-100 pt-3">
        <p className="text-sm text-slate-500">
          Checking dispute status...
        </p>
      </div>
    );
  }

  if (disputeQuery.isError) {
    return (
      <div className="border-t border-slate-100 pt-3">
        <p className="text-sm text-red-600">
          Unable to load rental dispute status.
        </p>
      </div>
    );
  }

  if (disputeQuery.data) {
    const dispute = disputeQuery.data;

    const canCancel =
      dispute.status === "OPEN" &&
      dispute.openedById === user?.id;

    return (
      <div className="space-y-3 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-slate-700">
            Rental dispute
          </h3>

          <span
            className={
              dispute.status === "OPEN"
                ? "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                : dispute.status === "RESOLVED"
                  ? "rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700"
                  : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
            }
          >
            {dispute.status}
          </span>
        </div>

        <div className="space-y-1 text-sm">
          <p className="font-medium text-slate-800">
            {dispute.reason}
          </p>

          {dispute.details && (
            <p className="whitespace-pre-wrap text-slate-600">
              {dispute.details}
            </p>
          )}

          {dispute.resolution && (
            <p className="text-xs text-slate-500">
              Resolution:{" "}
              {dispute.resolution === "RELEASE_DEPOSIT"
                ? "Deposit released"
                : "Deposit captured"}
            </p>
          )}

          {dispute.status === "CANCELLED" && (
            <p className="text-xs text-slate-500">
              This dispute was cancelled.
            </p>
          )}
        </div>

        {canCancel && (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              isLoading={cancelDispute.isPending}
              disabled={cancelDispute.isPending}
              onClick={() => {
                void cancelDispute
                  .mutateAsync()
                  .catch(() => {
                    // Mutation hook displays the backend error.
                  });
              }}
            >
              Cancel Dispute
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div>
          <h3 className="text-sm font-medium text-slate-700">
            Rental return
          </h3>

          <p className="text-xs text-slate-500">
            Report a problem before the return is confirmed.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setShowForm(true)}
        >
          Open Dispute
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-slate-100 pt-3">
      <div>
        <h3 className="text-sm font-medium text-slate-700">
          Open rental dispute
        </h3>

        <p className="text-xs text-slate-500">
          Describe the issue with this rental return.
        </p>
      </div>

      <input
        type="text"
        value={reason}
        onChange={(event) =>
          setReason(event.target.value)
        }
        placeholder="Reason"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />

      <textarea
        value={details}
        onChange={(event) =>
          setDetails(event.target.value)
        }
        placeholder="Additional details (optional)"
        rows={3}
        className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={openDispute.isPending}
          onClick={() => {
            setShowForm(false);
            setReason("");
            setDetails("");
          }}
        >
          Cancel
        </Button>

        <Button
          type="button"
          size="sm"
          variant="primary"
          isLoading={openDispute.isPending}
          disabled={
            openDispute.isPending ||
            !reason.trim()
          }
          onClick={() => {
            void openDispute
              .mutateAsync({
                reason: reason.trim(),
                details:
                  details.trim() || undefined,
              })
              .then(() => {
                setShowForm(false);
                setReason("");
                setDetails("");
              })
              .catch(() => {
                // Mutation hook displays the backend error.
              });
          }}
        >
          Open Dispute
        </Button>
      </div>
    </div>
  );
};