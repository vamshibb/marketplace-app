import { useRef } from "react";
import { Button } from "../../../shared/ui/Button";
import { useOrderActionMutation } from "../hooks/useOrderActionMutation";
import type { Order, OrderAction, OrderRole } from "../types";

const labels: Record<OrderAction, string> = {
  accept: "Accept", reject: "Reject", cancel: "Cancel", complete: "Complete",
  start: "Start Rental", return: "Mark Returned", "confirm-return": "Confirm Return",
};

export const OrderActions = ({ order, role }: { order: Order; role: OrderRole }) => {
  const mutation = useOrderActionMutation(order.id);
  const submitting = useRef(false);
  const isRental = order.transactionType === "RENT";
  const actions: OrderAction[] = [];
  if (order.status === "PENDING") {
    actions.push(...(role === "buyer" ? ["cancel"] as const : ["accept", "reject"] as const));
  } else if (role === "buyer") {
    if (!isRental && order.status === "ACCEPTED") actions.push("complete");
    if (isRental && order.status === "ACTIVE") actions.push("return");
  } else if (isRental) {
    if (order.status === "ACCEPTED") actions.push("start");
    if (order.status === "RETURN_PENDING") actions.push("confirm-return");
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
    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
      {actions.map(action => (
        <Button key={action} size="sm"
          variant={action === "reject" || action === "cancel" ? "secondary" : "primary"}
          disabled={mutation.isPending}
          aria-busy={mutation.isPending && mutation.variables === action || undefined}
          onClick={() => void act(action)}>
          {mutation.isPending && mutation.variables === action ? "Updating..." : labels[action]}
        </Button>
      ))}
    </div>
  );
};
