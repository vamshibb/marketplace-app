import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "./useAuthStore";

export const useLogout = () => {
  const queryClient = useQueryClient();
  const clearToken = useAuthStore((state) => state.clearToken);

  const logout = () => {
    clearToken();

    queryClient.removeQueries({
      queryKey: ["auth"],
    });
  };

  return logout;
};
