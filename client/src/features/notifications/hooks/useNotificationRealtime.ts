import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { subscribeToRealtimeEvents } from "../../../shared/realtime/realtimeEvents";
import { refreshNotificationCaches } from "../cache";

export const useNotificationRealtime = (userId?: string) => {
    const client = useQueryClient();

    useEffect(() => {
        if (!userId) return;

        const unsubscribe = subscribeToRealtimeEvents((eventName, payload) => {
            if (eventName === "connected") {
                void client.invalidateQueries({
                    queryKey: ["notifications", userId],
                    refetchType: "active",
                });
                return;
            }

            if (eventName === "notification_created") {
                void refreshNotificationCaches(client, userId);
                return;
            }

            if (eventName !== "notification_read_changed") {
                return;
            }

            if (!payload || typeof payload !== "object") {
                return;
            }

            const event = payload as Record<string, unknown>;
            const scope = typeof event.scope === "string" ? event.scope : undefined;

            if (scope === "notification" || scope === "conversation" || scope === "all") {
                void refreshNotificationCaches(client, userId);
            }
        });

        return unsubscribe;
    }, [client, userId]);
};
