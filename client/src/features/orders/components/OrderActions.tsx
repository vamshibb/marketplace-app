import { useRef } from "react";
import { Button } from "../../../shared/ui/Button";
import { useOrderActionMutation } from "../hooks/useOrderActionMutation";
import type { Order, OrderAction, OrderRole } from "../types";
import { useRentalDisputeQuery } from "../hooks/useRentalDispute";

const labels: Record<OrderAction, string> = {
  accept: "Accept",
  reject: "Reject",
  cancel: "Cancel",
  complete: "Complete",
  start: "Start Rental",
  return: "Mark Returned",
  "confirm-return": "Confirm Return",
};

export const OrderActions = ({
  order,
  role,
}: {
  order: Order;
  role: OrderRole;
}) => {
  const mutation = useOrderActionMutation(order.id);
  const submitting = useRef(false);

  const isRental = order.transactionType === "RENT";

  const shouldCheckDispute =
    isRental && order.status === "RETURN_PENDING";

  const disputeQuery = useRentalDisputeQuery(
    order.id,
    shouldCheckDispute
  );

  const hasOpenDispute =
    disputeQuery.data?.status === "OPEN";

  const paymentReady =
    order.paymentStatus === "AUTHORIZED" ||
    order.paymentStatus === "CAPTURED";

  const depositRequired =
    isRental &&
    order.rentalDepositAmount !== null &&
    Number(order.rentalDepositAmount) > 0;

  const depositReady =
    !depositRequired ||
    order.rentalDepositPaymentStatus === "AUTHORIZED" ||
    order.rentalDepositPaymentStatus === "CAPTURED";

  const canStartRental =
    paymentReady && depositReady;

  const startBlockedMessage =
    !paymentReady
      ? "Waiting for renter payment authorization."
      : !depositReady
        ? "Waiting for security deposit authorization."
        : null;

  const actions: OrderAction[] = [];

  if (order.status === "PENDING") {
    actions.push(
      ...(role === "buyer"
        ? (["cancel"] as const)
        : (["accept", "reject"] as const))
    );
  } else if (role === "buyer") {
    if (!isRental && order.status === "ACCEPTED") {
      actions.push("complete");
    }

    if (isRental && order.status === "ACTIVE") {
      actions.push("return");
    }
  } else if (isRental) {
    if (order.status === "ACCEPTED") {
      actions.push("start");
    }

    if (
      order.status === "RETURN_PENDING" &&
      !disputeQuery.isLoading &&
      !disputeQuery.isError &&
      !hasOpenDispute
    ) {
      actions.push("confirm-return");
    }
  }

  const act = async (action: OrderAction) => {
    if (submitting.current || mutation.isPending) return;

    submitting.current = true;

    try {
      await mutation.mutateAsync(action);
    } catch {
      // The mutation displays the existing toast error.
    } finally {
      submitting.current = false;
    }
  };

  if (!actions.length) return null;

  return (
    <div className="space-y-2 border-t border-slate-100 pt-3">
      {role === "seller" &&
        isRental &&
        order.status === "ACCEPTED" &&
        !canStartRental &&
        startBlockedMessage && (
          <p className="text-right text-xs text-slate-500">
            {startBlockedMessage}
          </p>
        )}

      <div className="flex flex-wrap justify-end gap-2">
        {actions.map((action) => {
          const startDisabled =
            action === "start" && !canStartRental;

          return (
            <Button
              key={action}
              size="sm"
              variant={
                action === "reject" || action === "cancel"
                  ? "secondary"
                  : "primary"
              }
              disabled={
                mutation.isPending ||
                startDisabled
              }
              aria-busy={
                mutation.isPending &&
                mutation.variables === action ||
                undefined
              }
              onClick={() => void act(action)}
            >
              {mutation.isPending &&
              mutation.variables === action
                ? "Updating..."
                : labels[action]}
            </Button>
          );
        })}
      </div>
    </div>
  );
};