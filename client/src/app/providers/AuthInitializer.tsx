import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type PropsWithChildren } from "react";

import { useAuthStore } from "../../features/auth/hooks/useAuthStore";
import { useCurrentUserQuery } from "../../features/auth/hooks/useCurrentUserQuery";
import { authQueryKeys } from "../../features/auth/queryKeys";

export const AuthInitializer = ({ children }: PropsWithChildren) => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const clearToken = useAuthStore((state) => state.clearToken);
  const {isError} = useCurrentUserQuery();

  useEffect(() => {
    if (!token || !isError) {
      return;
    }

    clearToken();
    queryClient.removeQueries({ queryKey: authQueryKeys.currentUser() });
  }, [clearToken, isError, queryClient, token]);

  return children;
};
