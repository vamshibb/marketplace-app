import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type PropsWithChildren } from "react";
import { isAxiosError } from "axios";

import { useAuthStore } from "../../features/auth/hooks/useAuthStore";
import { useCurrentUserQuery } from "../../features/auth/hooks/useCurrentUserQuery";
import { clearSessionCache } from "./sessionCache";

export const AuthInitializer = ({ children }: PropsWithChildren) => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const clearToken = useAuthStore((state) => state.clearToken);
  const { error } = useCurrentUserQuery();

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
