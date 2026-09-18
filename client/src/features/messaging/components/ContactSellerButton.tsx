import { useState, type ReactElement } from "react";
import { useAuthenticationGuard, useAuthStore, useCurrentUserQuery } from "../../auth";
import { useContactSeller } from "../hooks/useContactSeller";
import { FirstMessageModal } from "./FirstMessageModal";

interface ContactSellerButtonProps {
  productId: string;
  sellerId: string;
  sellerLabel?: string;
}

export const ContactSellerButton = ({ productId, sellerId, sellerLabel }: ContactSellerButtonProps): ReactElement | null => {
  const authenticate = useAuthenticationGuard();
  const token = useAuthStore((state) => state.token);
  const user = useCurrentUserQuery();
  const [composerOpen, setComposerOpen] = useState(false);
  const { existing, lookup } = useContactSeller(productId, sellerId, () => setComposerOpen(true));
  if (token && (!user.data || user.data.id === sellerId)) return null;

  return <>
    <button type="button" disabled={lookup.isPending} aria-busy={lookup.isPending || undefined}
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-50"
      onClick={() => authenticate(() => lookup.mutate())}>
      {lookup.isPending ? "Opening..." : token && existing ? "Continue Conversation" : "Contact Seller"}
    </button>
    {composerOpen && token && user.data && <FirstMessageModal
      key={`${productId}:${user.data.id}`}
      productId={productId} sellerId={sellerId} sellerLabel={sellerLabel}
      onClose={() => setComposerOpen(false)} />}
  </>;
};
