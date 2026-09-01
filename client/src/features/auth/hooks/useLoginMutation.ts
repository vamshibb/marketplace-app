import { useMutation } from "@tanstack/react-query";

import { login } from "../api/authApi";
import { useAuthStore } from "./useAuthStore";

export const useLoginMutation = () => {
  const setToken = useAuthStore((state) => state.setToken);

  return useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      setToken(session.token);
    },
  });
};
