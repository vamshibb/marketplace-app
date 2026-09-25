import { useRef, type KeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useOrdersQuery } from "../hooks/useOrdersQuery";
import { OrderCard } from "../components/OrderCard";
import type { OrderRole } from "../types";

export const OrdersPage = () => {
  const [params, setParams] = useSearchParams();
  const role: OrderRole = params.get("tab") === "sales" ? "seller" : "buyer";
  const setRole = (value: OrderRole) => setParams(previous => {
    const next = new URLSearchParams(previous);
    next.set("tab", value === "buyer" ? "purchases" : "sales");
    return next;
  }, { replace: true });
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const orders = useOrdersQuery(role);
  const roles: OrderRole[] = ["buyer", "seller"];
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1
      : event.key === "ArrowRight" || event.key === "ArrowLeft" ? 1 - index : null;
    if (next === null) return;
    event.preventDefault();
    setRole(roles[next]);
    tabs.current[next]?.focus();
  };
  return (
    <section className="w-full min-w-0 space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your purchases and sales.</p>
      </header>
      <div role="tablist" aria-label="Order lists" className="inline-flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {roles.map((value, index) => (
          <button key={value} ref={(element) => { tabs.current[index] = element; }}
            type="button" role="tab" id={`orders-${value}-tab`} aria-controls={`orders-${value}-panel`}
            aria-selected={role === value} tabIndex={role === value ? 0 : -1}
            onKeyDown={(event) => onTabKey(event, index)} onClick={() => setRole(value)}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 aria-selected:bg-white aria-selected:text-blue-600 aria-selected:shadow-sm focus-visible:outline-2 focus-visible:outline-blue-600">
            {value === "buyer" ? "Purchases" : "Sales"}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`orders-${role}-panel`} aria-labelledby={`orders-${role}-tab`} tabIndex={0} className="space-y-3">
        <p className="text-xs text-slate-500">Your most recent 20 {role === "buyer" ? "purchases" : "sales"}.</p>
        {orders.isPending ? <p role="status" className="py-4 text-sm text-slate-500">Loading orders...</p>
          : orders.isError ? <div role="alert" className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-red-600">Unable to load orders.</p>
            <button type="button" disabled={orders.isFetching} onClick={() => void orders.refetch()} className="rounded text-sm font-medium text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">{orders.isFetching ? "Retrying..." : "Retry"}</button>
          </div>
          : orders.data.length === 0 ? <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-slate-600">{role === "buyer" ? "No purchases yet." : "No incoming orders yet."}</p>
            <Link to="/products" className="text-sm font-medium text-blue-600 hover:underline">Browse Products</Link>
          </div>
          : <ul className="space-y-3">{orders.data.map((order) => <li key={order.id}><OrderCard order={order} role={role} /></li>)}</ul>}
      </div>
    </section>
  );
};
