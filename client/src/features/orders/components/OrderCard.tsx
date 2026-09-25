import { Link } from "react-router-dom";
import type { Order, OrderRole } from "../types";
import { OrderStatusBadge } from "./OrderStatusBadge";

export const OrderCard = ({ order, role }: { order: Order; role: OrderRole }) => {
  const counterpart = role === "buyer" ? order.seller : order.buyer;
  const price = Number(order.unitPrice);
  const formatPrice = (value: number) => "$" + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link to={`/products/${order.product.id}`} className="font-semibold wrap-anywhere text-slate-900 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600">{order.product.title}</Link>
          <p className="text-sm wrap-anywhere text-slate-600">{role === "buyer" ? "Seller" : "Buyer"}: {counterpart.displayName ?? counterpart.email}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm sm:grid-cols-4">
        <div><dt className="text-slate-500">Quantity</dt><dd className="mt-1 font-medium text-slate-800">{order.quantity}</dd></div>
        <div><dt className="text-slate-500">Unit price</dt><dd className="mt-1 font-medium text-slate-800">{formatPrice(price)}</dd></div>
        <div><dt className="text-slate-500">Total</dt><dd className="mt-1 font-semibold text-blue-600">{formatPrice(Math.round(price * 100) * order.quantity / 100)}</dd></div>
        <div><dt className="text-slate-500">Created</dt><dd className="mt-1 text-slate-800"><time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleDateString()}</time></dd></div>
      </dl>
    </article>
  );
};

