import { useState } from "react";
import { useAuthenticationGuard, useAuthStore, useCurrentUserQuery } from "../../auth";
import { OrderRequestModal } from "./OrderRequestModal";

export interface OrderRequestProduct {
  id: string;
  title: string;
  price: number;
  sellerId: string;
  listingType: "SALE" | "RENT";
  quantityAvailable: number;
  minRentalDays?: number | null;
  maxRentalDays?: number | null;
}
export const RequestOrderButton = ({ product }: { product: OrderRequestProduct }) => {
  const authenticate = useAuthenticationGuard();
  const token = useAuthStore(state => state.token);
  const { data: user } = useCurrentUserQuery();
  const [open, setOpen] = useState(false);
  if (token && (!user || user.id === product.sellerId)) return null;
  return <>
    <button type="button" onClick={() => authenticate(() => setOpen(true))}
      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
      {product.listingType === "RENT" ? "Request Rental" : "Request Purchase"}
    </button>
    {open && token && user && <OrderRequestModal key={product.id + user.id} product={product} onClose={() => setOpen(false)} />}
  </>;
};
