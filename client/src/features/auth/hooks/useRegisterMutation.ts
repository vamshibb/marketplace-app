import { useMutation, useQueryClient } from "@tanstack/react-query";

import { register } from "../api/authApi";
import { authQueryKeys } from "../queryKeys";
import { useAuthStore } from "./useAuthStore";

export const useRegisterMutation = () => {
  const queryClient = useQueryClient();
  const setToken = useAuthStore((state) => state.setToken);

  return useMutation({
    mutationFn: register,
    onSuccess: (session) => {
      queryClient.setQueryData(authQueryKeys.currentUser(), session.user);
      setToken(session.token);
    },
  });
};
