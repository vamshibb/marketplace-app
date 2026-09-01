import { useQuery } from "@tanstack/react-query";

import { getCurrentUser } from "../api/authApi";
import { authQueryKeys } from "../queryKeys";
import { useAuthStore } from "./useAuthStore";

export const useCurrentUserQuery = () => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: authQueryKeys.currentUser(),
    queryFn: getCurrentUser,
    enabled: Boolean(token),
  });
};
