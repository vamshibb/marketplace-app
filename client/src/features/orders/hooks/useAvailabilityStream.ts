import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { env } from "../../../app/config/env";
import { ordersQueryKeys } from "../queryKeys";

export const useAvailabilityStream = (productId: string, enabled: boolean): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !productId) return;

    const stream = new EventSource(
      `${env.apiBaseUrl.replace(/\/+$/, "")}/products/${encodeURIComponent(productId)}/availability/stream`,
    );
    const onAvailabilityChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.availabilityRoot(productId) });
    };

    stream.addEventListener("availability_changed", onAvailabilityChanged);
    return () => {
      stream.removeEventListener("availability_changed", onAvailabilityChanged);
      stream.close();
    };
  }, [productId, enabled, queryClient]);
};
