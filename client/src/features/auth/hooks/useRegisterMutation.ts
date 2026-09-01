import { useMutation } from "@tanstack/react-query";

import { register } from "../api/authApi";
import { useAuthStore } from "./useAuthStore";

export const useRegisterMutation = () => {
  const setToken = useAuthStore((state) => state.setToken);

  return useMutation({
    mutationFn: register,
    onSuccess: (session) => {
      setToken(session.token);
    },
  });
};
