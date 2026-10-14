import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type PropsWithChildren } from "react";
import { isAxiosError } from "axios";

import { useAuthStore } from "../../features/auth/hooks/useAuthStore";
import { useCurrentUserQuery } from "../../features/auth/hooks/useCurrentUserQuery";
import { useMessagingRealtime } from "../../features/messaging/hooks/useMessagingRealtime";
import { startSharedRealtime, stopSharedRealtime } from "../../shared/realtime/realtimeEvents";
import { clearSessionCache } from "./sessionCache";

export const AuthInitializer = ({ children }: PropsWithChildren) => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const clearToken = useAuthStore((state) => state.clearToken);
  const { data: user, error } = useCurrentUserQuery();

  useMessagingRealtime(user?.id);

  useEffect(() => {
    if (token && user?.id) {
      startSharedRealtime();
      return () => stopSharedRealtime("replacement");
    }

    stopSharedRealtime("logout");
    return undefined;
  }, [token, user?.id]);

  useEffect(() => useAuthStore.subscribe((state, previous) => {
    if (state.token !== previous.token) clearSessionCache(queryClient);
  }), [queryClient]);

  useEffect(() => {
    // The backend uses 401 for missing/invalid tokens. Network failures,
    // forbidden resources, and server outages are not session invalidation.
    if (!token || !isAxiosError(error) || error.response?.status !== 401) {
      return;
    }

    clearToken();
  }, [clearToken, error, token]);

  return children;
};
