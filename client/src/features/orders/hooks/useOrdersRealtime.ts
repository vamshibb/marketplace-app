import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { subscribeToRealtimeEvents } from "../../../shared/realtime/realtimeEvents";
import { ordersQueryKeys } from "../queryKeys";

const invalidateOrderCaches = async (
    client: ReturnType<typeof useQueryClient>,
    userId: string,
    orderId: string,
) => {
    await Promise.all([
        client.invalidateQueries({
            queryKey: ordersQueryKeys.list(userId, "buyer"),
            refetchType: "active",
        }),
        client.invalidateQueries({
            queryKey: ordersQueryKeys.list(userId, "seller"),
            refetchType: "active",
        }),
        client.invalidateQueries({
            queryKey: ordersQueryKeys.detail(userId, orderId),
            refetchType: "active",
        }),
        client.invalidateQueries({
            queryKey: ordersQueryKeys.action(userId, orderId),
            refetchType: "active",
        }),
    ]);
};

export const useOrdersRealtime = (userId?: string): void => {
    const client = useQueryClient();

    useEffect(() => {
        if (!userId) return;

        const unsubscribe = subscribeToRealtimeEvents((eventName, payload) => {
            if (eventName === "connected") {
                void client.invalidateQueries({
                    queryKey: ordersQueryKeys.root(userId),
                    refetchType: "active",
                });
                return;
            }

            if (eventName !== "order_changed") {
                return;
            }

            if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
                return;
            }

            const event = payload as Record<string, unknown>;
            const orderId = typeof event.orderId === "string" ? event.orderId.trim() : undefined;

            if (!orderId) {
                return;
            }

            void invalidateOrderCaches(client, userId, orderId);
        });

        return unsubscribe;
    }, [client, userId]);
};
