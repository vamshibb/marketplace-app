import type { ReactElement } from "react";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { useAuthenticationGuard, useAuthStore, useCurrentUserQuery } from "../../auth";
import { useCreateConversationMutation } from "../hooks/useCreateConversationMutation";
import { messagingQueryKeys } from "../queryKeys";

export const ContactSellerButton = ({ productId, sellerId }: { productId: string; sellerId: string }): ReactElement | null => {
  const authenticate = useAuthenticationGuard();
  const token = useAuthStore((state) => state.token);
  const user = useCurrentUserQuery();
  const mutation = useCreateConversationMutation(productId, sellerId);
  const queryClient = useQueryClient();
  const mutationKey = messagingQueryKeys.create(productId);
  const pending = useIsMutating({ mutationKey }) > 0;
  if (token && (!user.data || user.data.id === sellerId)) return null;

  return <button type="button" disabled={pending} aria-busy={pending || undefined}
    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-50"
    onClick={() => authenticate(() => {
      if (!queryClient.isMutating({ mutationKey })) mutation.mutate();
    })}>
    {pending ? "Opening..." : "Contact Seller"}
  </button>;
};
