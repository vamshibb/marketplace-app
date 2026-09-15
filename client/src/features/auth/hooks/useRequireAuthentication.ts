import toast from "react-hot-toast";

import { useAuthStore } from "./useAuthStore";

export const LOGIN_REQUIRED_MESSAGE = "Please login or create an account to continue.";

export const useRequireAuthentication = (): (() => boolean) => {
  const token = useAuthStore((state) => state.token);

  return () => {
    if (token) return true;
    toast(LOGIN_REQUIRED_MESSAGE, { id: "login-required" });
    return false;
  };
};
