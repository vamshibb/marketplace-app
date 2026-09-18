import { useMutation, useQueryClient } from "@tanstack/react-query";

import { login } from "../api/authApi";
import { authQueryKeys } from "../queryKeys";
import { useAuthStore } from "./useAuthStore";

export const useLoginMutation = () => {
  const queryClient = useQueryClient();
  const setToken = useAuthStore((state) => state.setToken);

  return useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      queryClient.setQueryData(authQueryKeys.currentUser(), session.user);
      setToken(session.token);
    },
  });
};
