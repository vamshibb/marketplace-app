import { useEffect, useRef, type KeyboardEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useCurrentUserQuery } from "../../auth";
import { useOrderQuery } from "../hooks/useOrderQuery";
import { useOrdersQuery } from "../hooks/useOrdersQuery";
import { OrderCard } from "../components/OrderCard";
import type { OrderRole } from "../types";

export const OrdersPage = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: user } = useCurrentUserQuery();
  const orderId = params.get("orderId") ?? "";
  const role: OrderRole = params.get("tab") === "sales" ? "seller" : "buyer";
  const setRole = (value: OrderRole) => setParams(previous => {
    const next = new URLSearchParams(previous);
    next.set("tab", value === "buyer" ? "purchases" : "sales");
    next.delete("orderId");
    return next;
  }, { replace: true });
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const orders = useOrdersQuery(role);
  const listedOrder = orders.data?.find(order => order.id === orderId);
  const detail = useOrderQuery(orderId, orders.isSuccess && !listedOrder);
  const target = listedOrder ?? detail.data;
  const wrongRole = Boolean(target && user && target[role].id !== user.id);
  const items = orders.data ?? [];
  const visibleOrders = !listedOrder && detail.data && !wrongRole ? [detail.data, ...items] : items;
  const selectedRow = useRef<HTMLLIElement>(null);
  const scrolled = useRef("");
  const failed = useRef("");
  useEffect(() => {
    if (!orderId || (!detail.isError && !wrongRole) || failed.current === orderId) return;
    failed.current = orderId;
    toast.error("Unable to access this order.");
    navigate("/orders", { replace: true });
  }, [orderId, detail.isError, wrongRole, navigate]);
  useEffect(() => {
    if (!orderId) { scrolled.current = ""; failed.current = ""; return; }
    if (orders.isSuccess && target && !wrongRole && selectedRow.current && scrolled.current !== orderId) {
      selectedRow.current.scrollIntoView({ block: "center" });
      selectedRow.current.focus({ preventScroll: true });
      scrolled.current = orderId;
    }
  }, [orderId, orders.isSuccess, target, wrongRole]);
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
        {orders.isPending || (orderId && orders.isSuccess && !listedOrder && detail.isPending) ? <p role="status" className="py-4 text-sm text-slate-500">Loading orders...</p>
          : orders.isError ? <div role="alert" className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-red-600">Unable to load orders.</p>
            <button type="button" disabled={orders.isFetching} onClick={() => void orders.refetch()} className="rounded text-sm font-medium text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">{orders.isFetching ? "Retrying..." : "Retry"}</button>
          </div>
          : visibleOrders.length === 0 ? <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-slate-600">{role === "buyer" ? "No purchases yet." : "No incoming orders yet."}</p>
            <Link to="/products" className="text-sm font-medium text-blue-600 hover:underline">Browse Products</Link>
          </div>
          : <ul className="space-y-3">{visibleOrders.map((order) => <li key={order.id}
              ref={order.id === orderId ? selectedRow : undefined}
              tabIndex={order.id === orderId ? -1 : undefined}
              className={order.id === orderId ? "scroll-mt-20 rounded-xl ring-2 ring-blue-500 ring-offset-2" : undefined}>
              <OrderCard order={order} role={role} /></li>)}</ul>}
      </div>
    </section>
  );
};
