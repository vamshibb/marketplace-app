import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import type { ReactElement } from "react";

import { useAuthenticationGuard, useAuthStore, useCurrentUserQuery } from "../../auth";
import { favoritesQueryKeys } from "../favoritesQueryKeys";
import { useFavoritesQuery } from "../hooks/useFavoritesQuery";
import { useToggleFavoriteMutation } from "../hooks/useToggleFavoriteMutation";
import type { ProductSummary } from "../types";

export const WishlistButton = ({ product }: { product: ProductSummary }): ReactElement | null => {
  const authenticate = useAuthenticationGuard();
  const token = useAuthStore((state) => state.token);
  const { data: user } = useCurrentUserQuery();
  const favorites = useFavoritesQuery();
  const toggle = useToggleFavoriteMutation(product);
  const queryClient = useQueryClient();
  const mutationKey = favoritesQueryKeys.toggle(product.id);
  const isPending = useIsMutating({ mutationKey }) > 0;
  const saved = Boolean(token && favorites.data?.some((item) => item.productId === product.id));

  if (token && user?.id === product.sellerId) return null;

  const label = saved ? "Remove from wishlist" : "Add to wishlist";
  return (
    <button
      type="button"
      aria-label={`${label}: ${product.title}`}
      aria-pressed={saved}
      aria-busy={isPending || undefined}
      title={label}
      disabled={isPending}
      className={`absolute top-2 right-2 flex size-11 items-center justify-center rounded-full bg-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-50 ${saved ? "text-blue-600" : "text-slate-700"}`}
      onClick={() => {
        const saveOnly = !useAuthStore.getState().token;
        authenticate(() => {
          if (!queryClient.isMutating({ mutationKey })) toggle.mutate({ saveOnly });
        });
      }}
    >
      <Heart className="size-5" fill={saved ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
};
