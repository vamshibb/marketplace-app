import type { OrderStatus } from "../types";

const styles: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  ACCEPTED: "bg-blue-50 text-blue-700",
  REJECTED: "bg-red-50 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-600",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  ACTIVE: "bg-blue-50 text-blue-700",
  RETURN_PENDING: "bg-amber-50 text-amber-800",
};
const labels: Record<OrderStatus, string> = {
  PENDING: "Pending", ACCEPTED: "Accepted", REJECTED: "Rejected",
  CANCELLED: "Cancelled", COMPLETED: "Completed",
  ACTIVE: "Active", RETURN_PENDING: "Awaiting return confirmation",
};
export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>
);
