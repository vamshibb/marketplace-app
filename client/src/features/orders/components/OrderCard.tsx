import { useState } from "react";
import { isAxiosError } from "axios";
import { BuyerReputation, OrderReviews } from "../../reviews";
import { Link } from "react-router-dom";
import { Button } from "../../../shared/ui/Button";
import { useAuthorizeOrderPaymentMutation } from "../hooks/useOrderActionMutation";
import type { Order, OrderRole } from "../types";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderActions } from "./OrderActions";
import { rentalDuration } from "../utils/rentalDuration";
import { RentalDisputeSection } from "./RentalDisputeSection";

export const OrderCard = ({ order, role, selected = false, onReputationToggle }: { order: Order; role: OrderRole; selected?: boolean; onReputationToggle: (open: boolean) => void }) => {
  const counterpart = role === "buyer" ? order.seller : order.buyer;
  const price = Number(order.unitPrice);
  const isRental = order.transactionType === "RENT";
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const authorizeOrderPayment = useAuthorizeOrderPaymentMutation(order.id);
  const from = order.requestedFrom?.slice(0, 10);
  const to = order.requestedTo?.slice(0, 10);
  const days = isRental ? rentalDuration(from, to) : 1;
  const total = days === null ? null : Math.round(price * 100) * days * order.quantity / 100;
  const formatRentalDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: "UTC" });
  const formatPrice = (value: number) => "$" + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link to={`/products/${order.product.id}`} className="font-semibold wrap-anywhere text-slate-900 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600">{order.product.title}</Link>
          <p className="text-sm wrap-anywhere text-slate-600">{role === "buyer" ? "Seller" : "Buyer"}: {counterpart.displayName ?? counterpart.email}</p>
          {role === "seller" && <BuyerReputation buyerId={order.buyer.id} open={selected} onOpenChange={onReputationToggle} />}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {isRental && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">RENT</span>}
          <OrderStatusBadge status={order.status} />
        </div>
      </div>
      {isRental && <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
        {days !== null && from && to ? <>
          <p><time dateTime={from}>{formatRentalDate(from)}</time> → <time dateTime={to}>{formatRentalDate(to)}</time></p>
          <p>{days} {days === 1 ? "day" : "days"}</p>
        </> : <p>Rental dates unavailable</p>}
      </div>}
      <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm sm:grid-cols-4">
        <div><dt className="text-slate-500">Quantity</dt><dd className="mt-1 font-medium text-slate-800">{order.quantity}</dd></div>
        <div><dt className="text-slate-500">Unit price</dt><dd className="mt-1 font-medium text-slate-800">{formatPrice(price)}{isRental ? " / day" : ""}</dd></div>
        <div><dt className="text-slate-500">{isRental ? "Rental total" : "Total"}</dt><dd className="mt-1 font-semibold text-blue-600">{total === null ? "—" : formatPrice(total)}</dd></div>
        <div><dt className="text-slate-500">Created</dt><dd className="mt-1 text-slate-800"><time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleDateString()}</time></dd></div>
      </dl>
      {role === "buyer" && (order.status === "ACCEPTED" || order.status === "ACTIVE") && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-slate-700">Payment</h3>
              <p className="text-xs text-slate-500">
                {paymentStatus ? `Status: ${paymentStatus}` : "Authorize payment to continue."}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="primary"
              isLoading={authorizeOrderPayment.isPending}
              disabled={
                paymentStatus === "AUTHORIZED" ||
                paymentStatus === "CAPTURED"
              }
              onClick={() => {
                setPaymentMessage(null);
                void authorizeOrderPayment.mutateAsync()
                  .then((payment) => {
                    setPaymentStatus(payment.status);
                  })
                  .catch((error) => {
                    const message = isAxiosError(error) && typeof error.response?.data?.message === "string"
                      ? error.response.data.message
                      : error instanceof Error
                        ? error.message
                        : "Payment unavailable.";
                    setPaymentMessage(message);
                  });
              }}
            >
              {paymentStatus ? paymentStatus : "Authorize Payment"}
            </Button>
          </div>
          {paymentMessage && <p className="text-xs text-red-600">{paymentMessage}</p>}
        </div>
      )}
      {order.notes?.trim() && (
        <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
          <h3 className="font-medium text-slate-700">Notes</h3>
          <p className="whitespace-pre-wrap wrap-anywhere text-slate-600">{order.notes}</p>
        </div>
      )}
      <RentalDisputeSection order={order} />
      <OrderActions order={order} role={role} />
      {order.status === "COMPLETED" && <OrderReviews orderId={order.id} role={role} completed />}
    </article>
  );
};
